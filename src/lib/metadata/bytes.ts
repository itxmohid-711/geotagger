const CHUNK_SIZE = 0x8000; // 32768 bytes

/**
 * Converts an ArrayBuffer to a binary string in chunks to prevent call stack overflow.
 */
export function arrayBufferToBinaryString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  const len = bytes.length;

  for (let i = 0; i < len; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
    // Apply String.fromCharCode on small chunks
    chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
  }

  return chunks.join('');
}

/**
 * Converts a binary string to a Uint8Array in chunks.
 */
export function binaryStringToUint8Array(str: string): Uint8Array {
  const len = str.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i += CHUNK_SIZE) {
    const end = Math.min(i + CHUNK_SIZE, len);
    for (let j = i; j < end; j++) {
      bytes[j] = str.charCodeAt(j) & 0xff;
    }
  }

  return bytes;
}
