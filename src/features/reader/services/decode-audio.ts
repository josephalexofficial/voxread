/**
 * Decodes a base64 MP3 into a blob the audio element can play.
 *
 * @param audioBase64 - Base64 audio from the synthesis route.
 * @returns An MPEG blob.
 *
 * @throws {Error} When the payload is not valid base64.
 */
export function decodeAudioBase64(audioBase64: string): Blob {
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: 'audio/mpeg' });
}
