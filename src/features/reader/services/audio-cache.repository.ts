import { CharacterAlignmentSchema, type AudioCacheRecord, type CharacterAlignment } from '@/features/reader/types/reader.types';
import { AUDIO_STORE, getReaderDatabase, requestToPromise, transactionDone } from '@/features/reader/services/reader-database';

interface RetainedAudio {
  url: string;
  documentId: string;
}

const memoryAudio = new Map<string, AudioCacheRecord>();
const objectUrls = new Map<string, RetainedAudio>();

/**
 * Reads one cached studio render.
 *
 * @param cacheKey - Hash of the document, voice settings, and chunk text.
 * @returns The record, or null when this section has not been rendered.
 */
export async function readAudioCache(cacheKey: string): Promise<AudioCacheRecord | null> {
  const memoryRecord = memoryAudio.get(cacheKey);

  if (memoryRecord) {
    return memoryRecord;
  }

  const database = await getReaderDatabase();

  if (!database) {
    return null;
  }

  const transaction = database.transaction(AUDIO_STORE, 'readonly');
  const record = await requestToPromise(transaction.objectStore(AUDIO_STORE).get(cacheKey));
  return normalizeAudioRecord(record);
}

/**
 * Checks which chunk keys are already saved.
 *
 * @param cacheKeys - Keys for the current voice and document.
 * @returns The subset that can play without a new render.
 */
export async function findCachedKeys(cacheKeys: readonly string[]): Promise<Set<string>> {
  const found = new Set<string>();

  await Promise.all(
    cacheKeys.map(async (cacheKey) => {
      const record = await readAudioCache(cacheKey);

      if (record) {
        found.add(cacheKey);
      }
    }),
  );

  return found;
}

/**
 * Saves a studio render so the next play does not spend credits again.
 *
 * @param record - Audio blob plus the alignment used for follow-along.
 */
export async function saveAudioCache(record: AudioCacheRecord): Promise<void> {
  memoryAudio.set(record.cacheKey, record);
  const database = await getReaderDatabase();

  if (!database) {
    return;
  }

  const transaction = database.transaction(AUDIO_STORE, 'readwrite');
  transaction.objectStore(AUDIO_STORE).put(record);
  await transactionDone(transaction);
}

/**
 * Deletes every cached render that belongs to a reading.
 *
 * @param documentId - Reading being removed or replaced.
 */
export async function deleteAudioCacheForDocument(documentId: string): Promise<void> {
  for (const [cacheKey, record] of memoryAudio) {
    if (record.documentId === documentId) {
      memoryAudio.delete(cacheKey);
    }
  }

  revokeDocumentAudio(documentId);
  const database = await getReaderDatabase();

  if (!database) {
    return;
  }

  const transaction = database.transaction(AUDIO_STORE, 'readwrite');
  const index = transaction.objectStore(AUDIO_STORE).index('documentId');
  const keys = await requestToPromise(index.getAllKeys(documentId));

  if (Array.isArray(keys)) {
    for (const key of keys) {
      transaction.objectStore(AUDIO_STORE).delete(key);
    }
  }

  await transactionDone(transaction);
}

/**
 * Reuses one object URL per cached blob for the life of the page.
 *
 * @param cacheKey - Cache identity.
 * @param documentId - Owning reading, used when the reading is deleted.
 * @param blob - Decoded audio.
 * @returns A URL the audio element can play.
 */
export function retainObjectUrl(cacheKey: string, documentId: string, blob: Blob): string {
  const existing = objectUrls.get(cacheKey);

  if (existing) {
    return existing.url;
  }

  const url = URL.createObjectURL(blob);
  objectUrls.set(cacheKey, { url, documentId });
  return url;
}

/**
 * Releases decoded audio owned by a reading.
 *
 * @param documentId - Reading id.
 */
export function revokeDocumentAudio(documentId: string): void {
  for (const [cacheKey, retained] of objectUrls) {
    if (retained.documentId !== documentId) {
      continue;
    }

    URL.revokeObjectURL(retained.url);
    objectUrls.delete(cacheKey);
  }
}

/**
 * Releases every object URL created during the session.
 */
export function revokeAllObjectUrls(): void {
  for (const retained of objectUrls.values()) {
    URL.revokeObjectURL(retained.url);
  }

  objectUrls.clear();
}

function normalizeAudioRecord(record: unknown): AudioCacheRecord | null {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const candidate = record as Partial<AudioCacheRecord>;

  if (typeof candidate.cacheKey !== 'string' || typeof candidate.documentId !== 'string') {
    return null;
  }

  if (!(candidate.blob instanceof Blob) || typeof candidate.textLength !== 'number') {
    return null;
  }

  const alignment = candidate.alignment ? CharacterAlignmentSchema.safeParse(candidate.alignment) : null;

  return {
    cacheKey: candidate.cacheKey,
    documentId: candidate.documentId,
    blob: candidate.blob,
    alignment: alignment?.success ? (alignment.data as CharacterAlignment) : null,
    textLength: candidate.textLength,
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date(0).toISOString(),
  };
}
