import { z } from 'zod';

import { PREFERENCE_RECORD_ID, MAX_DOCUMENT_CHARACTERS } from '@/features/reader/constants/limits';
import { DEFAULT_MODEL_ID, SYNTHESIS_MODEL_IDS } from '@/features/synthesis/constants/models';

export const DOCUMENT_ORIGINS = ['paste', 'text-file', 'pdf', 'sample'] as const;

export type DocumentOrigin = (typeof DOCUMENT_ORIGINS)[number];

export type PlaybackEngine = 'device' | 'studio';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused';

export type ThemePreference = 'system' | 'light' | 'dark';

export type TextScale = 'sm' | 'md' | 'lg' | 'xl';

export type LineHeightPreference = 'compact' | 'comfortable' | 'relaxed';

export interface ReadingSentence {
  index: number;
  paragraphIndex: number;
  text: string;
}

export interface ReadingDocument {
  id: string;
  title: string;
  sourceText: string;
  sentences: ReadingSentence[];
  createdAt: string;
  updatedAt: string;
  origin: DocumentOrigin;
}

export interface SentenceSpan {
  sentenceIndex: number;
  startOffset: number;
  endOffset: number;
}

export interface ChunkPlan {
  chunkIndex: number;
  text: string;
  spans: SentenceSpan[];
}

export interface AnnotatedChunkPlan extends ChunkPlan {
  cacheKey: string;
  characterCount: number;
}

export interface CharacterAlignment {
  characters: string[];
  startTimesSeconds: number[];
  endTimesSeconds: number[];
}

export interface AudioCacheRecord {
  cacheKey: string;
  documentId: string;
  blob: Blob;
  alignment: CharacterAlignment | null;
  textLength: number;
  createdAt: string;
}

export interface StudioChunk {
  chunkIndex: number;
  audioUrl: string;
  alignment: CharacterAlignment | null;
  textLength: number;
}

export const DISPLAY_PREFERENCE_VERSION = 3;

export interface ReaderPreferences {
  id: typeof PREFERENCE_RECORD_ID;
  displayVersion: number;
  theme: ThemePreference;
  isHighContrast: boolean;
  isDyslexiaFont: boolean;
  textScale: TextScale;
  lineHeight: LineHeightPreference;
  playbackEngine: PlaybackEngine;
  voiceId: string | null;
  modelId: (typeof SYNTHESIS_MODEL_IDS)[number];
  stability: number;
  similarityBoost: number;
  speed: number;
  activeDocumentId: string | null;
}

export const ReadingSentenceSchema = z.object({
  index: z.number().int().nonnegative(),
  paragraphIndex: z.number().int().nonnegative(),
  text: z.string().trim().min(1),
});

export const ReadingDocumentSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  sourceText: z.string().trim().min(1).max(MAX_DOCUMENT_CHARACTERS),
  sentences: z.array(ReadingSentenceSchema).min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  origin: z.enum(DOCUMENT_ORIGINS),
});

export const CharacterAlignmentSchema = z.object({
  characters: z.array(z.string()),
  startTimesSeconds: z.array(z.number()),
  endTimesSeconds: z.array(z.number()),
});

export const ReaderPreferencesSchema = z.object({
  id: z.literal(PREFERENCE_RECORD_ID).default(PREFERENCE_RECORD_ID),
  displayVersion: z.number().int().nonnegative().default(DISPLAY_PREFERENCE_VERSION),
  theme: z.enum(['system', 'light', 'dark']).default('system'),
  isHighContrast: z.boolean().default(true),
  isDyslexiaFont: z.boolean().default(true),
  textScale: z.enum(['sm', 'md', 'lg', 'xl']).default('sm'),
  lineHeight: z.enum(['compact', 'comfortable', 'relaxed']).default('relaxed'),
  playbackEngine: z.enum(['device', 'studio']).default('device'),
  voiceId: z.string().min(1).nullable().default(null),
  modelId: z.enum(SYNTHESIS_MODEL_IDS).default(DEFAULT_MODEL_ID),
  stability: z.number().min(0).max(1).default(0.5),
  similarityBoost: z.number().min(0).max(1).default(0.75),
  speed: z.number().min(0.7).max(1.2).default(1),
  activeDocumentId: z.string().uuid().nullable().default(null),
});

/**
 * Fills missing preference fields and falls back when stored data is unusable.
 *
 * @param input - Value read from storage.
 * @returns A complete preference record.
 */
export function normalizePreferences(input: unknown): ReaderPreferences {
  const record = typeof input === 'object' && input !== null ? input : {};
  const storedVersion =
    'displayVersion' in record && typeof record.displayVersion === 'number' ? record.displayVersion : 0;
  const parsed = ReaderPreferencesSchema.safeParse(record);
  const preferences = parsed.success ? parsed.data : ReaderPreferencesSchema.parse({});

  if (storedVersion >= DISPLAY_PREFERENCE_VERSION) {
    return preferences;
  }

  return {
    ...preferences,
    displayVersion: DISPLAY_PREFERENCE_VERSION,
    isHighContrast: storedVersion >= 2 ? preferences.isHighContrast : true,
    isDyslexiaFont: storedVersion >= 2 ? preferences.isDyslexiaFont : true,
    textScale: storedVersion >= 2 ? preferences.textScale : 'sm',
    lineHeight: storedVersion >= 2 ? preferences.lineHeight : 'relaxed',
    stability: 0.5,
    similarityBoost: 0.75,
    speed: 1,
  };
}
