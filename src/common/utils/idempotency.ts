const COMPLETED_TTL_MS = 2 * 60 * 1000;
const MAX_COMPLETED = 12;

interface CompletedEntry<T> {
  expiresAtMs: number;
  value: T;
}

const pendingByKey = new Map<string, Promise<unknown>>();
const completedByKey = new Map<string, CompletedEntry<unknown>>();

/**
 * Accepts an idempotency key shaped like a hash or a compact token.
 *
 * @param request - Incoming request.
 * @returns The header value, or null when it is missing or malformed.
 */
export function readIdempotencyKey(request: Request): string | null {
  const header = request.headers.get('idempotency-key')?.trim() ?? '';

  if (!/^[A-Za-z0-9_-]{8,128}$/.test(header)) {
    return null;
  }

  return header;
}

function readCompleted<T>(key: string): T | null {
  const entry = completedByKey.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAtMs <= Date.now()) {
    completedByKey.delete(key);
    return null;
  }

  return entry.value as T;
}

/**
 * Runs a producer once per key, including while the first call is still in flight.
 * A parallel retry therefore cannot start a second provider render.
 *
 * @param key - Caller-supplied idempotency key.
 * @param producer - Work that must not run twice for the same key.
 * @returns The original result for duplicate keys inside the retention window.
 */
export function withIdempotency<T>(key: string, producer: () => Promise<T>): Promise<T> {
  const completed = readCompleted<T>(key);

  if (completed) {
    return Promise.resolve(completed);
  }

  const pending = pendingByKey.get(key);

  if (pending) {
    return pending as Promise<T>;
  }

  const promise = producer()
    .then((value) => {
      completedByKey.set(key, {
        expiresAtMs: Date.now() + COMPLETED_TTL_MS,
        value,
      });

      while (completedByKey.size > MAX_COMPLETED) {
        const oldestKey = completedByKey.keys().next().value;

        if (!oldestKey) {
          break;
        }

        completedByKey.delete(oldestKey);
      }

      return value;
    })
    .finally(() => {
      pendingByKey.delete(key);
    });

  pendingByKey.set(key, promise);
  return promise;
}
