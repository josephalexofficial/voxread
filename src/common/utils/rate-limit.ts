import { RateLimitError } from '@/common/errors/domain-errors';

const WINDOW_MS = 60_000;
const hitsByKey = new Map<string, number[]>();

/**
 * Reads a stable client key from the forwarding header.
 *
 * @param request - Incoming request.
 * @returns The first forwarded address, or "local" when the header is absent.
 */
export function readClientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');

  if (forwarded) {
    const firstHop = forwarded.split(',')[0]?.trim();

    if (firstHop) {
      return firstHop.slice(0, 80);
    }
  }

  return 'local';
}

/**
 * Rejects a caller that has exceeded the allowed number of hits in the window.
 *
 * @param bucket - Logical route name combined with the client key.
 * @param maxRequests - Maximum hits allowed per minute.
 *
 * @throws {RateLimitError} When the bucket is full.
 */
export function assertWithinRateLimit(bucket: string, maxRequests: number): void {
  const nowMs = Date.now();
  const recentHits = (hitsByKey.get(bucket) ?? []).filter((hitMs) => nowMs - hitMs < WINDOW_MS);

  if (recentHits.length >= maxRequests) {
    hitsByKey.set(bucket, recentHits);
    throw new RateLimitError('Too many requests. Wait a minute and try again.');
  }

  recentHits.push(nowMs);
  hitsByKey.set(bucket, recentHits);

  if (hitsByKey.size > 500) {
    for (const [key, hits] of hitsByKey) {
      if (hits.every((hitMs) => nowMs - hitMs >= WINDOW_MS)) {
        hitsByKey.delete(key);
      }
    }
  }
}
