/** A single reading cannot exceed this size, so one action cannot drain a credit grant. */
export const MAX_DOCUMENT_CHARACTERS = 20_000;

/** Studio requests stay short so the first sentence can play quickly. */
export const MAX_CHUNK_CHARACTERS = 1_100;

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const SYNTHESIS_TIMEOUT_MS = 70_000;

export const PROVIDER_TIMEOUT_MS = 55_000;

export const SAMPLE_DOCUMENT_ID = '00000000-0000-4000-8000-000000000001';

export const PREFERENCE_RECORD_ID = 'reader';

export const APPEARANCE_STORAGE_KEY = 'voxread-appearance';
