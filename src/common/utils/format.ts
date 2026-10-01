const countFormatter = new Intl.NumberFormat('en');

/**
 * Formats a non-negative count with grouping separators.
 *
 * @param value - Integer-like count. Non-finite values become zero.
 * @returns A display string such as "1,240".
 */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return countFormatter.format(Math.max(0, Math.round(value)));
}

/**
 * Rounds a slider value so cache keys stay stable across tiny float drift.
 *
 * @param value - Raw numeric setting.
 * @returns The value rounded to two decimal places, or zero when it is not finite.
 */
export function roundSetting(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 100) / 100;
}

/**
 * Describes how recently a document was saved.
 *
 * @param isoTimestamp - ISO-8601 timestamp.
 * @param nowMs - Current time in milliseconds, passed in so the function stays pure.
 * @returns A short relative label, or an empty string when the timestamp is invalid.
 */
export function formatUpdatedAt(isoTimestamp: string, nowMs: number): string {
  const parsed = Date.parse(isoTimestamp);

  if (!Number.isFinite(parsed)) {
    return '';
  }

  const deltaSeconds = Math.round((nowMs - parsed) / 1000);

  if (deltaSeconds < 45) {
    return 'Just now';
  }

  const deltaMinutes = Math.round(deltaSeconds / 60);

  if (deltaMinutes < 60) {
    return `${deltaMinutes} min ago`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);

  if (deltaHours < 24) {
    return `${deltaHours} hr ago`;
  }

  const deltaDays = Math.round(deltaHours / 24);

  if (deltaDays < 14) {
    return `${deltaDays} day${deltaDays === 1 ? '' : 's'} ago`;
  }

  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(parsed));
}
