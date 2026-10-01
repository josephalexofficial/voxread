import { ReadingDocumentSchema, type ReadingDocument } from '@/features/reader/types/reader.types';
import { DOCUMENT_STORE, getReaderDatabase, requestToPromise, transactionDone } from '@/features/reader/services/reader-database';

const memoryDocuments = new Map<string, ReadingDocument>();

/**
 * Lists saved readings, newest first. Corrupt records are skipped.
 *
 * @returns Stored documents.
 */
export async function listDocuments(): Promise<ReadingDocument[]> {
  const database = await getReaderDatabase();

  if (!database) {
    return sortDocuments([...memoryDocuments.values()]);
  }

  const transaction = database.transaction(DOCUMENT_STORE, 'readonly');
  const records = await requestToPromise(transaction.objectStore(DOCUMENT_STORE).getAll());
  const documents = (Array.isArray(records) ? records : [])
    .map((record) => ReadingDocumentSchema.safeParse(record))
    .flatMap((result) => (result.success ? [result.data] : []));

  return sortDocuments(documents);
}

/**
 * Inserts or replaces a reading.
 *
 * @param document - Validated reading.
 */
export async function saveDocument(document: ReadingDocument): Promise<void> {
  const database = await getReaderDatabase();

  if (!database) {
    memoryDocuments.set(document.id, document);
    return;
  }

  const transaction = database.transaction(DOCUMENT_STORE, 'readwrite');
  transaction.objectStore(DOCUMENT_STORE).put(document);
  await transactionDone(transaction);
}

/**
 * Removes a reading. Audio cleanup is the caller's responsibility.
 *
 * @param documentId - Reading id.
 */
export async function deleteDocument(documentId: string): Promise<void> {
  memoryDocuments.delete(documentId);
  const database = await getReaderDatabase();

  if (!database) {
    return;
  }

  const transaction = database.transaction(DOCUMENT_STORE, 'readwrite');
  transaction.objectStore(DOCUMENT_STORE).delete(documentId);
  await transactionDone(transaction);
}

function sortDocuments(documents: ReadingDocument[]): ReadingDocument[] {
  return [...documents].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
