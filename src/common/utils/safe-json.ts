/**
 * Parses JSON and returns a fallback when the payload is empty or malformed.
 *
 * @param payload - Raw text that may not be JSON.
 * @param fallback - Value returned for null, empty, or invalid input.
 * @returns The parsed value or the fallback.
 */
export function safeJsonParse<T>(payload: string | null | undefined, fallback: T): T {
  if (!payload || typeof payload !== 'string') {
    return fallback;
  }

  try {
    return JSON.parse(payload) as T;
  } catch {
    return fallback;
  }
}
