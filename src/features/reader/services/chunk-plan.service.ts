import { sha256Hex } from '@/common/utils/hash';
import { roundSetting } from '@/common/utils/format';
import { MAX_CHUNK_CHARACTERS } from '@/features/reader/constants/limits';
import type { AnnotatedChunkPlan, ChunkPlan, ReadingSentence, SentenceSpan } from '@/features/reader/types/reader.types';
import type { SynthesisModelId } from '@/features/synthesis/constants/models';

export interface StudioSettings {
  voiceId: string;
  modelId: SynthesisModelId;
  stability: number;
  similarityBoost: number;
  speed: number;
}

/**
 * Packs sentences into provider requests without cutting a sentence in half.
 *
 * @param sentences - Segmented reading. Each sentence must already fit in one chunk.
 * @returns Ordered chunk plans. The joined text is what ElevenLabs will speak.
 */
export function planSynthesisChunks(sentences: readonly ReadingSentence[]): ChunkPlan[] {
  const groups: ReadingSentence[][] = [];
  let currentGroup: ReadingSentence[] = [];
  let currentLength = 0;

  for (const sentence of sentences) {
    const separatorLength = currentGroup.length > 0 ? 1 : 0;
    const nextLength = currentLength + separatorLength + sentence.text.length;

    if (currentGroup.length > 0 && nextLength > MAX_CHUNK_CHARACTERS) {
      groups.push(currentGroup);
      currentGroup = [sentence];
      currentLength = sentence.text.length;
      continue;
    }

    currentGroup.push(sentence);
    currentLength = nextLength;
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups.map((group, chunkIndex) => buildChunk(group, chunkIndex));
}

/**
 * Adds a stable cache key so a repeated listen does not render again.
 *
 * @param documentId - Owning reading. Included so deleting that reading can drop only its audio.
 * @param settings - Voice and render settings that change the audio.
 * @param plans - Chunk text produced by {@link planSynthesisChunks}.
 * @returns The same plans plus cache keys.
 */
export async function annotateChunkPlans(
  documentId: string,
  settings: StudioSettings,
  plans: readonly ChunkPlan[],
): Promise<AnnotatedChunkPlan[]> {
  return Promise.all(
    plans.map(async (plan) => ({
      ...plan,
      characterCount: plan.text.length,
      cacheKey: await sha256Hex(
        [
          documentId,
          settings.voiceId,
          settings.modelId,
          roundSetting(settings.stability).toFixed(2),
          roundSetting(settings.similarityBoost).toFixed(2),
          roundSetting(settings.speed).toFixed(2),
          plan.text,
        ].join('\u001f'),
      ),
    })),
  );
}

function buildChunk(group: readonly ReadingSentence[], chunkIndex: number): ChunkPlan {
  const spans: SentenceSpan[] = [];
  let text = '';

  for (const sentence of group) {
    if (text.length > 0) {
      text += ' ';
    }

    const startOffset = text.length;
    text += sentence.text;
    spans.push({
      sentenceIndex: sentence.index,
      startOffset,
      endOffset: text.length,
    });
  }

  return {
    chunkIndex,
    text,
    spans,
  };
}
