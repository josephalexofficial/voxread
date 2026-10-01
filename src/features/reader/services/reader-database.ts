const DATABASE_NAME = 'voxread';
const DATABASE_VERSION = 1;

export const DOCUMENT_STORE = 'documents';
export const AUDIO_STORE = 'audioCache';
export const PREFERENCE_STORE = 'preferences';

let databasePromise: Promise<IDBDatabase | null> | null = null;

/**
 * Opens the local reading database once. A failure switches the session to memory
 * for this page load instead of crashing the reader.
 *
 * @returns The database, or null when IndexedDB cannot be opened.
 */
export function getReaderDatabase(): Promise<IDBDatabase | null> {
  if (!databasePromise) {
    databasePromise = openReaderDatabase().catch(() => null);
  }

  return databasePromise;
}

function openReaderDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(DOCUMENT_STORE)) {
        database.createObjectStore(DOCUMENT_STORE, { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains(AUDIO_STORE)) {
        const audioStore = database.createObjectStore(AUDIO_STORE, { keyPath: 'cacheKey' });
        audioStore.createIndex('documentId', 'documentId', { unique: false });
      }

      if (!database.objectStoreNames.contains(PREFERENCE_STORE)) {
        database.createObjectStore(PREFERENCE_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB could not be opened.'));
  });
}

/**
 * Converts an IndexedDB request into a promise.
 *
 * @param request - Pending request.
 * @returns The request result.
 */
export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

/**
 * Resolves when a transaction commits.
 *
 * @param transaction - Open transaction.
 * @returns Nothing when the transaction completes.
 */
export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
  });
}
