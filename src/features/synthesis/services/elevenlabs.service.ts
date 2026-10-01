import { z } from 'zod';

import {
  ConfigurationError,
  ExternalServiceError,
  QuotaError,
  ValidationError,
} from '@/common/errors/domain-errors';
import { logger } from '@/common/utils/logger';
import { safeJsonParse } from '@/common/utils/safe-json';
import { PROVIDER_TIMEOUT_MS } from '@/features/reader/constants/limits';
import type { CharacterAlignment } from '@/features/reader/types/reader.types';
import type { SynthesisRequest, UsageSummary, VoiceSummary } from '@/features/synthesis/types/synthesis.dto';

const ELEVENLABS_ORIGIN = 'https://api.elevenlabs.io';
const VOICE_CACHE_MS = 10 * 60 * 1000;
const USAGE_CACHE_MS = 20_000;

const ProviderAlignmentSchema = z.object({
  characters: z.array(z.string()),
  character_start_times_seconds: z.array(z.number()),
  character_end_times_seconds: z.array(z.number()),
});

const ProviderSynthesisSchema = z.object({
  audio_base64: z.string().min(1),
  alignment: ProviderAlignmentSchema.nullable().optional(),
  normalized_alignment: ProviderAlignmentSchema.nullable().optional(),
});

const ProviderVoiceSchema = z.object({
  voice_id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  preview_url: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  labels: z.record(z.string(), z.string()).nullable().optional(),
});

const ProviderVoicesSchema = z.object({
  voices: z.array(ProviderVoiceSchema),
});

const ProviderUsageSchema = z.object({
  character_count: z.number().nonnegative().default(0),
  character_limit: z.number().nonnegative().default(0),
  tier: z.string().nullable().optional(),
  next_character_count_reset_unix: z.number().nullable().optional(),
});

interface CacheEntry<T> {
  expiresAtMs: number;
  value: T;
}

let voiceCache: CacheEntry<VoiceSummary[]> | null = null;
let usageCache: CacheEntry<UsageSummary> | null = null;

export interface StudioRender {
  audioBase64: string;
  alignment: CharacterAlignment | null;
  characterCount: number;
}

/**
 * Lists voices available to the configured ElevenLabs account.
 *
 * @returns Voice summaries sorted with premade voices first.
 *
 * @throws {ConfigurationError} When the API key is missing.
 * @throws {ExternalServiceError} When ElevenLabs rejects the key or returns an unusable payload.
 */
export async function listVoices(): Promise<VoiceSummary[]> {
  if (voiceCache && voiceCache.expiresAtMs > Date.now()) {
    return voiceCache.value;
  }

  const response = await elevenLabsFetch('/v1/voices', { method: 'GET' }, 15_000);
  const payload = ProviderVoicesSchema.safeParse(await readJson(response));

  if (!payload.success) {
    throw new ExternalServiceError('ElevenLabs returned an unexpected voice list.');
  }

  const voices = payload.data.voices
    .map((voice) => ({
      id: voice.voice_id,
      name: voice.name,
      category: voice.category ?? 'custom',
      previewUrl: readPreviewUrl(voice.preview_url),
      accent: readLabel(voice.labels, 'accent'),
      description: voice.description?.trim() || null,
    }))
    .sort(compareVoices)
    .slice(0, 80);

  voiceCache = {
    expiresAtMs: Date.now() + VOICE_CACHE_MS,
    value: voices,
  };

  return voices;
}

/**
 * Reads the current character allowance without logging account identifiers.
 *
 * @returns Used, remaining, and reset metadata.
 *
 * @throws {ConfigurationError} When the API key is missing.
 * @throws {ExternalServiceError} When the subscription payload cannot be read.
 */
export async function readUsage(): Promise<UsageSummary> {
  if (usageCache && usageCache.expiresAtMs > Date.now()) {
    return usageCache.value;
  }

  const response = await elevenLabsFetch('/v1/user/subscription', { method: 'GET' }, 15_000);
  const payload = ProviderUsageSchema.safeParse(await readJson(response));

  if (!payload.success) {
    throw new ExternalServiceError('ElevenLabs returned an unexpected usage record.');
  }

  const characterCount = payload.data.character_count;
  const characterLimit = payload.data.character_limit;
  const resetUnix = payload.data.next_character_count_reset_unix;
  const usage: UsageSummary = {
    characterCount,
    characterLimit,
    remainingCharacters: Math.max(0, characterLimit - characterCount),
    tier: payload.data.tier ?? null,
    resetsAt: resetUnix ? new Date(resetUnix * 1000).toISOString() : null,
  };

  usageCache = {
    expiresAtMs: Date.now() + USAGE_CACHE_MS,
    value: usage,
  };

  return usage;
}

/**
 * Renders one text section and keeps character timings when they match the original text.
 * Conditioning text is intentionally omitted. Its billing rules are easy to misread, and this
 * project treats the hackathon credit grant as a scarce budget.
 *
 * @param request - Validated section, voice, and settings.
 * @returns Base64 audio plus alignment for follow-along.
 *
 * @throws {ConfigurationError} When the API key is missing.
 * @throws {QuotaError} When the account has no credits left.
 * @throws {ExternalServiceError} When rendering fails or times out.
 */
export async function renderSpeech(request: SynthesisRequest): Promise<StudioRender> {
  const params = new URLSearchParams({ output_format: 'mp3_44100_128' });
  const response = await elevenLabsFetch(
    `/v1/text-to-speech/${request.voiceId}/with-timestamps?${params.toString()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: request.text,
        model_id: request.modelId,
        apply_text_normalization: 'auto',
        voice_settings: {
          stability: request.voiceSettings.stability,
          similarity_boost: request.voiceSettings.similarityBoost,
          speed: request.voiceSettings.speed,
          use_speaker_boost: true,
        },
      }),
    },
    PROVIDER_TIMEOUT_MS,
  );

  const payload = ProviderSynthesisSchema.safeParse(await readJson(response));

  if (!payload.success) {
    throw new ExternalServiceError('ElevenLabs returned audio that VoxRead could not read.');
  }

  logger.info('Studio section rendered', {
    characterCount: request.text.length,
    modelId: request.modelId,
  });

  return {
    audioBase64: payload.data.audio_base64,
    alignment: chooseAlignment(payload.data.alignment, request.text.length),
    characterCount: request.text.length,
  };
}

/**
 * Extracts selectable text from a PDF. Scanned pages are rejected because OCR is a separate
 * pipeline and would send page images to another service.
 *
 * @param bytes - PDF file bytes.
 * @returns Plain text and the page count.
 *
 * @throws {ValidationError} When the file is not a readable PDF or contains no selectable text.
 * @throws {ExternalServiceError} When the parser fails.
 */
export async function extractPdfDocument(bytes: Uint8Array): Promise<{ text: string; pageCount: number }> {
  if (!hasPdfSignature(bytes)) {
    throw new ValidationError('Upload a PDF file.', [{ field: 'file', issue: 'The file is not a PDF.' }]);
  }

  try {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(bytes);
    const extracted = await extractText(pdf, { mergePages: true });
    const text = Array.isArray(extracted.text) ? extracted.text.join('\n\n') : extracted.text;
    const pageCount = extracted.totalPages;

    return {
      text: text.replace(/\u0000/g, '').trim(),
      pageCount: pageCount > 0 ? pageCount : 1,
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    logger.error('PDF extraction failed', { error });
    throw new ExternalServiceError('That PDF could not be read. If it is a scan, copy the text out and paste it.');
  }
}

async function elevenLabsFetch(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const apiKey = readApiKey();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${ELEVENLABS_ORIGIN}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'xi-api-key': apiKey,
        ...init.headers,
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      await throwProviderError(response);
    }

    return response;
  } catch (error) {
    if (error instanceof ExternalServiceError || error instanceof QuotaError || error instanceof ConfigurationError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ExternalServiceError('ElevenLabs took too long to respond. Try a shorter section.');
    }

    throw new ExternalServiceError('Could not reach ElevenLabs.');
  } finally {
    clearTimeout(timeoutId);
  }
}

function readApiKey(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();

  if (!apiKey) {
    throw new ConfigurationError('Add ELEVENLABS_API_KEY to the server environment to render studio voices.');
  }

  return apiKey;
}

async function readJson(response: Response): Promise<unknown> {
  const raw = await response.text();
  return safeJsonParse<unknown>(raw, null);
}

async function throwProviderError(response: Response): Promise<never> {
  const raw = await response.text();
  const payload = safeJsonParse<unknown>(raw, null);
  const provider = readProviderFailure(payload);

  if (provider.code.includes('quota')) {
    throw new QuotaError('ElevenLabs credits are used up for this account.');
  }

  if (response.status === 401) {
    throw new ExternalServiceError('ElevenLabs rejected the API key.');
  }

  throw new ExternalServiceError(provider.message);
}

function readProviderFailure(payload: unknown): { code: string; message: string } {
  if (!payload || typeof payload !== 'object' || !('detail' in payload)) {
    return { code: 'provider_error', message: 'ElevenLabs could not render this section.' };
  }

  const detail = payload.detail;

  if (typeof detail === 'string') {
    return { code: 'provider_error', message: clampMessage(detail) };
  }

  if (detail && typeof detail === 'object') {
    const record = detail as Record<string, unknown>;
    const message = typeof record.message === 'string' ? record.message : 'ElevenLabs could not render this section.';
    const code =
      typeof record.code === 'string' ? record.code : typeof record.status === 'string' ? record.status : 'provider_error';

    return {
      code: code.toLowerCase(),
      message: clampMessage(message),
    };
  }

  return { code: 'provider_error', message: 'ElevenLabs could not render this section.' };
}

function chooseAlignment(
  alignment: z.infer<typeof ProviderAlignmentSchema> | null | undefined,
  textLength: number,
): CharacterAlignment | null {
  if (!alignment) {
    return null;
  }

  if (alignment.characters.length !== textLength || alignment.character_start_times_seconds.length !== textLength) {
    return null;
  }

  if (alignment.character_end_times_seconds.length !== textLength) {
    return null;
  }

  return {
    characters: alignment.characters,
    startTimesSeconds: alignment.character_start_times_seconds,
    endTimesSeconds: alignment.character_end_times_seconds,
  };
}

function readPreviewUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function readLabel(labels: Record<string, string> | null | undefined, key: string): string | null {
  const value = labels?.[key]?.trim();
  return value ? value : null;
}

function compareVoices(left: VoiceSummary, right: VoiceSummary): number {
  if (left.category === 'premade' && right.category !== 'premade') {
    return -1;
  }

  if (right.category === 'premade' && left.category !== 'premade') {
    return 1;
  }

  return left.name.localeCompare(right.name);
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  const signature = [0x25, 0x50, 0x44, 0x46];
  return signature.every((byte, index) => bytes[index] === byte);
}

function clampMessage(message: string): string {
  const compact = message.replace(/\s+/g, ' ').trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}
