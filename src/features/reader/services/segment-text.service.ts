import { MAX_CHUNK_CHARACTERS, MAX_DOCUMENT_CHARACTERS } from '@/features/reader/constants/limits';
import type { DocumentOrigin, ReadingDocument, ReadingSentence } from '@/features/reader/types/reader.types';

const ABBREVIATIONS = new Set(['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'eg', 'ie', 'fig', 'vol', 'no']);

export type DocumentDraftResult =
  | { ok: true; document: ReadingDocument }
  | { ok: false; message: string };

/**
 * Builds a stored reading from raw text.
 *
 * @param input - Identity, timestamps, and the untouched source. Timestamps are arguments so the builder stays pure.
 * @returns The document, or a message the composer can show.
 */
export function buildReadingDocument(input: {
  id: string;
  title: string;
  sourceText: string;
  origin: DocumentOrigin;
  createdAt: string;
  updatedAt: string;
}): DocumentDraftResult {
  const sourceText = normalizeSourceText(input.sourceText);

  if (!sourceText) {
    return { ok: false, message: 'Add some text before starting a reading.' };
  }

  if (sourceText.length > MAX_DOCUMENT_CHARACTERS) {
    return {
      ok: false,
      message: `This reading is too long. Keep it under ${MAX_DOCUMENT_CHARACTERS.toLocaleString('en')} characters so one render cannot spend the whole credit grant.`,
    };
  }

  const sentences = segmentSourceText(sourceText);

  if (sentences.length === 0) {
    return { ok: false, message: 'Add some text before starting a reading.' };
  }

  const title = normalizeTitle(input.title, sourceText);

  return {
    ok: true,
    document: {
      id: input.id,
      title,
      sourceText,
      sentences,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      origin: input.origin,
    },
  };
}

/**
 * Turns a first line into a library title when the reader does not type one.
 *
 * @param sourceText - Normalized reading text.
 * @returns A title no longer than 72 characters.
 */
export function deriveTitle(sourceText: string): string {
  const firstLine = sourceText
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  return clampTitle(firstLine ?? 'Untitled reading');
}

/**
 * Splits source text into paragraph-aware sentences that each fit in one studio request.
 *
 * @param sourceText - Normalized reading text.
 * @returns Sentences with stable indexes.
 */
export function segmentSourceText(sourceText: string): ReadingSentence[] {
  const paragraphs = sourceText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter((paragraph) => paragraph.length > 0);

  const sentences: ReadingSentence[] = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const pieces = splitParagraphIntoSentences(paragraph).flatMap((sentence) =>
      splitOverlongSentence(sentence, MAX_CHUNK_CHARACTERS),
    );

    for (const piece of pieces) {
      sentences.push({
        index: sentences.length,
        paragraphIndex,
        text: piece,
      });
    }
  });

  return sentences;
}

/**
 * Groups sentences so the reading surface can preserve paragraph breaks.
 *
 * @param sentences - Flat sentence list from a document.
 * @returns Paragraph groups in reading order.
 */
export function groupSentencesByParagraph(sentences: readonly ReadingSentence[]): ReadingSentence[][] {
  const groups: ReadingSentence[][] = [];

  for (const sentence of sentences) {
    const currentGroup = groups[groups.length - 1];
    const firstSentence = currentGroup?.[0];

    if (!currentGroup || !firstSentence || firstSentence.paragraphIndex !== sentence.paragraphIndex) {
      groups.push([sentence]);
      continue;
    }

    currentGroup.push(sentence);
  }

  return groups;
}

function normalizeSourceText(sourceText: string): string {
  return sourceText.replace(/\r\n/g, '\n').replace(/\u0000/g, '').trim();
}

function normalizeTitle(title: string, sourceText: string): string {
  const trimmed = title.trim();

  if (!trimmed) {
    return deriveTitle(sourceText);
  }

  return clampTitle(trimmed);
}

function clampTitle(title: string): string {
  const compact = title.replace(/\s+/g, ' ').trim();

  if (compact.length <= 72) {
    return compact;
  }

  const sliced = compact.slice(0, 72);
  const lastSpace = sliced.lastIndexOf(' ');
  const cut = lastSpace > 24 ? sliced.slice(0, lastSpace) : sliced;
  return `${cut.trim()}…`;
}

function splitParagraphIntoSentences(paragraph: string): string[] {
  const sentences: string[] = [];
  let startIndex = 0;

  for (let index = 0; index < paragraph.length; index += 1) {
    const character = characterAt(paragraph, index);

    if (character !== '.' && character !== '!' && character !== '?') {
      continue;
    }

    if (!isSentenceBoundary(paragraph, index)) {
      continue;
    }

    if (character === '.' && ABBREVIATIONS.has(readWordBefore(paragraph, index).toLowerCase())) {
      continue;
    }

    const sentence = paragraph.slice(startIndex, index + 1).trim();

    if (sentence) {
      sentences.push(sentence);
    }

    startIndex = index + 1;
  }

  const tail = paragraph.slice(startIndex).trim();

  if (tail) {
    sentences.push(tail);
  }

  return sentences;
}

function isSentenceBoundary(value: string, punctuationIndex: number): boolean {
  let cursor = punctuationIndex + 1;

  while (cursor < value.length && /["'”’)\]]/.test(characterAt(value, cursor) ?? '')) {
    cursor += 1;
  }

  if (cursor >= value.length) {
    return true;
  }

  if (!/\s/.test(characterAt(value, cursor) ?? '')) {
    return false;
  }

  while (cursor < value.length && /\s/.test(characterAt(value, cursor) ?? '')) {
    cursor += 1;
  }

  if (cursor >= value.length) {
    return true;
  }

  return /[A-Z0-9"“]/.test(characterAt(value, cursor) ?? '');
}

function readWordBefore(value: string, punctuationIndex: number): string {
  let cursor = punctuationIndex - 1;
  let word = '';

  while (cursor >= 0) {
    const character = characterAt(value, cursor);

    if (!character || !/[A-Za-z.]/.test(character)) {
      break;
    }

    word = `${character}${word}`;
    cursor -= 1;
  }

  return word.replace(/\./g, '');
}

function splitOverlongSentence(sentence: string, maxCharacters: number): string[] {
  if (sentence.length <= maxCharacters) {
    return [sentence];
  }

  const pieces: string[] = [];
  let remaining = sentence;

  while (remaining.length > maxCharacters) {
    const window = remaining.slice(0, maxCharacters);
    const semicolonBreak = window.lastIndexOf('; ');
    const commaBreak = window.lastIndexOf(', ');
    const spaceBreak = window.lastIndexOf(' ');
    const preferredBreak = Math.max(semicolonBreak, commaBreak, spaceBreak);
    const cutIndex = preferredBreak > 40 ? preferredBreak + 1 : maxCharacters;
    const piece = remaining.slice(0, cutIndex).trim();

    if (piece) {
      pieces.push(piece);
    }

    remaining = remaining.slice(cutIndex).trim();
  }

  if (remaining) {
    pieces.push(remaining);
  }

  return pieces;
}

function characterAt(value: string, index: number): string | undefined {
  if (index < 0 || index >= value.length) {
    return undefined;
  }

  return value[index];
}
