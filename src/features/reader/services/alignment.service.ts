import type { CharacterAlignment, SentenceSpan } from '@/features/reader/types/reader.types';

/**
 * Finds the sentence being spoken at a playback time.
 *
 * @param textLength - Character length of the chunk text sent to the provider.
 * @param alignment - Character timings for that exact text, when the provider returned a matching map.
 * @param spans - Sentence offsets inside the chunk text.
 * @param timeSeconds - Current audio time.
 * @param durationSeconds - Decoded audio duration, used only when alignment is missing.
 * @returns The sentence index, or null when the chunk has no spans.
 */
export function findSentenceIndexAtTime(
  textLength: number,
  alignment: CharacterAlignment | null,
  spans: readonly SentenceSpan[],
  timeSeconds: number,
  durationSeconds: number,
): number | null {
  const firstSpan = spans[0];
  const lastSpan = spans[spans.length - 1];

  if (!firstSpan || !lastSpan) {
    return null;
  }

  const offset = resolveCharacterOffset(textLength, alignment, timeSeconds, durationSeconds);
  const span = spans.find((item) => offset >= item.startOffset && offset < item.endOffset);
  return span?.sentenceIndex ?? lastSpan.sentenceIndex;
}

/**
 * Finds where a sentence starts inside a rendered chunk.
 *
 * @param textLength - Character length of the chunk text.
 * @param alignment - Character timings, or null when playback must estimate from duration.
 * @param spans - Sentence offsets inside the chunk text.
 * @param sentenceIndex - Target sentence.
 * @param durationSeconds - Decoded audio duration.
 * @returns A seek time in seconds.
 */
export function findStartTimeForSentence(
  textLength: number,
  alignment: CharacterAlignment | null,
  spans: readonly SentenceSpan[],
  sentenceIndex: number,
  durationSeconds: number,
): number {
  const span = spans.find((item) => item.sentenceIndex === sentenceIndex);

  if (!span) {
    return 0;
  }

  if (hasMatchingAlignment(alignment, textLength)) {
    const startTime = alignment.startTimesSeconds[span.startOffset];
    return startTime ?? 0;
  }

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || textLength <= 0) {
    return 0;
  }

  return durationSeconds * (span.startOffset / textLength);
}

function resolveCharacterOffset(
  textLength: number,
  alignment: CharacterAlignment | null,
  timeSeconds: number,
  durationSeconds: number,
): number {
  if (hasMatchingAlignment(alignment, textLength)) {
    let offset = 0;

    for (let index = 0; index < alignment.startTimesSeconds.length; index += 1) {
      const startTime = alignment.startTimesSeconds[index];

      if (startTime !== undefined && startTime <= timeSeconds + 0.03) {
        offset = index;
      }
    }

    return offset;
  }

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || textLength <= 0) {
    return 0;
  }

  const ratio = Math.min(1, Math.max(0, timeSeconds / durationSeconds));
  return Math.min(textLength - 1, Math.floor(ratio * textLength));
}

function hasMatchingAlignment(
  alignment: CharacterAlignment | null,
  textLength: number,
): alignment is CharacterAlignment {
  return alignment !== null && alignment.startTimesSeconds.length === textLength && textLength > 0;
}
