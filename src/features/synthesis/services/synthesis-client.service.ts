import { requestApi } from '@/common/utils/api-client';
import { SYNTHESIS_TIMEOUT_MS } from '@/features/reader/constants/limits';
import type { CharacterAlignment } from '@/features/reader/types/reader.types';
import {
  ExtractionResultSchema,
  SynthesisResultSchema,
  UsageSummarySchema,
  VoiceSummarySchema,
  type SynthesisRequest,
  type UsageSummary,
  type VoiceSummary,
} from '@/features/synthesis/types/synthesis.dto';
import { z } from 'zod';

const VoicesSchema = z.array(VoiceSummarySchema);

/**
 * Loads studio voices from the VoxRead server.
 *
 * @returns Voices available to the configured ElevenLabs account.
 */
export function fetchVoices(): Promise<VoiceSummary[]> {
  return requestApi('/api/v1/voices', VoicesSchema);
}

/**
 * Loads the remaining character allowance.
 *
 * @returns Usage for the configured account.
 */
export function fetchUsage(): Promise<UsageSummary> {
  return requestApi('/api/v1/usage', UsageSummarySchema);
}

/**
 * Renders one section. The idempotency key is the content hash, so a double click
 * cannot start two provider jobs for the same audio.
 *
 * @param request - Section text and voice settings.
 * @param idempotencyKey - Stable cache key for this exact render.
 * @returns Audio and alignment.
 */
export function requestSynthesis(
  request: SynthesisRequest,
  idempotencyKey: string,
): Promise<{ audioBase64: string; alignment: CharacterAlignment | null; characterCount: number }> {
  return requestApi(
    '/api/v1/syntheses',
    SynthesisResultSchema,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(request),
    },
    SYNTHESIS_TIMEOUT_MS,
  );
}

/**
 * Sends a PDF to the server and returns its selectable text.
 *
 * @param file - PDF chosen by the reader.
 * @returns Extracted text and page count.
 */
export function requestPdfExtraction(file: File): Promise<{ text: string; pageCount: number; characterCount: number }> {
  const body = new FormData();
  body.set('file', file);
  return requestApi('/api/v1/extractions', ExtractionResultSchema, { method: 'POST', body }, 30_000);
}
