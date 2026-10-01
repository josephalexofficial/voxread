import { z } from 'zod';

import { MAX_CHUNK_CHARACTERS } from '@/features/reader/constants/limits';
import { SYNTHESIS_MODEL_IDS } from '@/features/synthesis/constants/models';

export const VoiceSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string(),
  previewUrl: z.string().url().nullable(),
  accent: z.string().nullable(),
  description: z.string().nullable(),
});

export type VoiceSummary = z.infer<typeof VoiceSummarySchema>;

export const UsageSummarySchema = z.object({
  characterCount: z.number().nonnegative(),
  characterLimit: z.number().nonnegative(),
  remainingCharacters: z.number().nonnegative(),
  tier: z.string().nullable(),
  resetsAt: z.string().nullable(),
});

export type UsageSummary = z.infer<typeof UsageSummarySchema>;

export const SynthesisRequestSchema = z.object({
  text: z.string().trim().min(1, 'Text is required.').max(MAX_CHUNK_CHARACTERS, 'This section is too long to render.'),
  voiceId: z.string().regex(/^[a-zA-Z0-9]{8,40}$/, 'Choose a valid voice.'),
  modelId: z.enum(SYNTHESIS_MODEL_IDS),
  voiceSettings: z.object({
    stability: z.number().min(0).max(1),
    similarityBoost: z.number().min(0).max(1),
    speed: z.number().min(0.7).max(1.2),
  }),
});

export type SynthesisRequest = z.infer<typeof SynthesisRequestSchema>;

export const CharacterAlignmentDtoSchema = z.object({
  characters: z.array(z.string()),
  startTimesSeconds: z.array(z.number()),
  endTimesSeconds: z.array(z.number()),
});

export const SynthesisResultSchema = z.object({
  audioBase64: z.string().min(1),
  alignment: CharacterAlignmentDtoSchema.nullable(),
  characterCount: z.number().int().positive(),
});

export type SynthesisResult = z.infer<typeof SynthesisResultSchema>;

export const ExtractionResultSchema = z.object({
  text: z.string(),
  pageCount: z.number().int().positive(),
  characterCount: z.number().int().nonnegative(),
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
