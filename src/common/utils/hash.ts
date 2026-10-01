/**
 * Returns the SHA-256 hex digest of a string.
 *
 * @param value - Text to hash. Callers should join cache-key parts themselves.
 * @returns Lowercase hex digest.
 *
 * @throws {Error} When the Web Crypto digest implementation is unavailable.
 */
export async function sha256Hex(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto is unavailable in this runtime.');
  }

  const encoded = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
