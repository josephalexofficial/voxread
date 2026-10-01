import { APPEARANCE_STORAGE_KEY, PREFERENCE_RECORD_ID } from '@/features/reader/constants/limits';
import {
  DISPLAY_PREFERENCE_VERSION,
  normalizePreferences,
  type ReaderPreferences,
} from '@/features/reader/types/reader.types';
import { getReaderDatabase, PREFERENCE_STORE, requestToPromise, transactionDone } from '@/features/reader/services/reader-database';

let memoryPreferences: ReaderPreferences | null = null;

/**
 * Reads appearance and voice settings.
 *
 * @returns Stored preferences, or the defaults when nothing has been saved.
 */
export async function readPreferences(): Promise<ReaderPreferences> {
  if (memoryPreferences) {
    return memoryPreferences;
  }

  const database = await getReaderDatabase();

  if (!database) {
    return normalizePreferences({});
  }

  const transaction = database.transaction(PREFERENCE_STORE, 'readonly');
  const record = await requestToPromise(transaction.objectStore(PREFERENCE_STORE).get(PREFERENCE_RECORD_ID));
  const preferences = normalizePreferences(record ?? {});
  const storedVersion = readStoredVersion(record);

  if (storedVersion < DISPLAY_PREFERENCE_VERSION) {
    await savePreferences(preferences);
  }

  return preferences;
}

/**
 * Persists preferences and mirrors appearance into localStorage for the boot script.
 *
 * @param preferences - Complete preference record.
 * @returns True when both stores accepted the write.
 */
export async function savePreferences(preferences: ReaderPreferences): Promise<boolean> {
  memoryPreferences = preferences;
  const mirrored = mirrorAppearance(preferences);
  const database = await getReaderDatabase();

  if (!database) {
    return mirrored;
  }

  const transaction = database.transaction(PREFERENCE_STORE, 'readwrite');
  transaction.objectStore(PREFERENCE_STORE).put(preferences);
  await transactionDone(transaction);
  return mirrored;
}

function readStoredVersion(record: unknown): number {
  if (typeof record === 'object' && record !== null && 'displayVersion' in record && typeof record.displayVersion === 'number') {
    return record.displayVersion;
  }

  return 0;
}

function mirrorAppearance(preferences: ReaderPreferences): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }

  try {
    localStorage.setItem(
      APPEARANCE_STORAGE_KEY,
      JSON.stringify({
        displayVersion: preferences.displayVersion,
        theme: preferences.theme,
        isHighContrast: preferences.isHighContrast,
        isDyslexiaFont: preferences.isDyslexiaFont,
        textScale: preferences.textScale,
        lineHeight: preferences.lineHeight,
      }),
    );
    return true;
  } catch {
    return false;
  }
}
