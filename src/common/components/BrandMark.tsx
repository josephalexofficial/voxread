/**
 * Wordmark glyph: a page with two voice arcs.
 *
 * @returns Decorative SVG. The accessible name lives on the surrounding text.
 */
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="4.5" y="5" width="14" height="22" rx="2.2" />
      <path d="M21.5 12.2c2.1 1.5 3.3 3.3 3.3 5.3s-1.2 3.8-3.3 5.3" />
      <path d="M24.2 9.2c3.1 2.3 4.8 5.1 4.8 8.3s-1.7 6-4.8 8.3" />
    </svg>
  );
}
