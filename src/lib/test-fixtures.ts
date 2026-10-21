/**
 * Tiny valid 1x1 JPEG fixture in base64 format.
 * Length: 149 bytes, complete with SOI (FFD8), DQT (FFDB), SOF0 (FFC0), DHT (FFC4), SOS (FFDA), and EOI (FFD9).
 */
export const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
  'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
  'AAAAAAAAAAAAAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8Af//Z';

export function getTinyJpegBytes(): Uint8Array {
  const binary = atob(TINY_JPEG_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function getTinyJpegFile(name = 'test.jpg'): File {
  const bytes = getTinyJpegBytes();
  return new File([bytes.buffer as ArrayBuffer], name, { type: 'image/jpeg' });
}
