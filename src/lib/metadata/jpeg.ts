export interface JpegSegment {
  marker: number;
  start: number; // offset of marker 0xFF
  length: number; // total segment length including marker and length field
  payloadStart: number;
  payloadLength: number;
}

/**
 * Validates whether the given bytes represent a valid JPEG image (starts with SOI 0xFFD8).
 */
export function isJpeg(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  return bytes[0] === 0xff && bytes[1] === 0xd8;
}

/**
 * Parses JPEG markers up to Start of Scan (SOS 0xFFDA) or End of Image (EOI 0xFFD9).
 * Returns an array of segment headers and positions.
 */
export function parseJpegSegments(bytes: Uint8Array): {
  segments: JpegSegment[];
  sosOffset: number;
} {
  if (!isJpeg(bytes)) {
    throw new Error('Not a valid JPEG: missing 0xFFD8 Start of Image marker.');
  }

  const segments: JpegSegment[] = [];
  let offset = 2; // skip 0xFF 0xD8
  const len = bytes.length;
  let sosOffset = -1;

  while (offset < len) {
    if (bytes[offset] !== 0xff) {
      // Find next 0xFF
      offset++;
      continue;
    }

    // Skip fill bytes (consecutive 0xFF)
    while (offset < len && bytes[offset] === 0xff) {
      offset++;
    }

    if (offset >= len) break;

    const marker = bytes[offset];
    const markerOffset = offset - 1; // position of the 0xFF before marker
    offset++;

    // Standalone markers without length:
    // RST0 - RST7 (0xD0 - 0xD7), SOI (0xD8), TEM (0x01)
    if (
      (marker >= 0xd0 && marker <= 0xd7) ||
      marker === 0xd8 ||
      marker === 0x01
    ) {
      segments.push({
        marker,
        start: markerOffset,
        length: 2,
        payloadStart: offset,
        payloadLength: 0,
      });
      continue;
    }

    // SOS (Start of Scan 0xFFDA) or EOI (End of Image 0xFFD9)
    if (marker === 0xda) {
      sosOffset = markerOffset;
      break;
    }
    if (marker === 0xd9) {
      break;
    }

    // Variable length marker: read 2-byte length (includes length bytes themselves)
    if (offset + 1 >= len) {
      break;
    }

    const segLen = (bytes[offset] << 8) | bytes[offset + 1];
    if (segLen < 2) {
      throw new Error(`Corrupted JPEG segment length ${segLen} at marker 0x${marker.toString(16)}`);
    }

    const totalSegLength = 2 + segLen; // marker (2) + payload (segLen)
    const payloadStart = offset + 2;
    const payloadLength = segLen - 2;

    segments.push({
      marker,
      start: markerOffset,
      length: totalSegLength,
      payloadStart,
      payloadLength,
    });

    offset += segLen;
  }

  return { segments, sosOffset };
}

/**
 * Inserts or replaces an APP1 segment matching a given predicate/signature in JPEG bytes.
 * If newPayload is null, removes matching APP1 segments.
 * All other bytes (including other APP segments and SOS pixel data) remain byte-identical.
 */
export function insertOrReplaceApp1Segment(
  jpegBytes: Uint8Array,
  matchesSignature: (payload: Uint8Array) => boolean,
  newPayload: Uint8Array | null
): Uint8Array {
  if (!isJpeg(jpegBytes)) {
    throw new Error('Invalid JPEG format.');
  }

  const { segments } = parseJpegSegments(jpegBytes);

  // Find existing matching segment(s)
  const matchingIndices: number[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.marker === 0xe1) {
      // APP1
      const payload = jpegBytes.subarray(
        seg.payloadStart,
        seg.payloadStart + seg.payloadLength
      );
      if (matchesSignature(payload)) {
        matchingIndices.push(i);
      }
    }
  }

  // Create new segment buffer if newPayload provided
  let newSegmentBytes: Uint8Array | null = null;
  if (newPayload) {
    const totalLength = newPayload.length + 2; // length field itself is included
    if (totalLength > 65535) {
      throw new Error('APP1 segment payload exceeds maximum allowable 65533 bytes.');
    }
    newSegmentBytes = new Uint8Array(4 + newPayload.length);
    newSegmentBytes[0] = 0xff;
    newSegmentBytes[1] = 0xe1;
    newSegmentBytes[2] = (totalLength >> 8) & 0xff;
    newSegmentBytes[3] = totalLength & 0xff;
    newSegmentBytes.set(newPayload, 4);
  }

  if (matchingIndices.length > 0) {
    // Replace the first matching segment, and drop any subsequent duplicate matching segments
    const parts: Uint8Array[] = [];

    let currentPos = 0;
    for (let i = 0; i < segments.length; i++) {
      if (matchingIndices.includes(i)) {
        const seg = segments[i];
        if (seg.start > currentPos) {
          parts.push(jpegBytes.subarray(currentPos, seg.start));
        }
        if (i === matchingIndices[0] && newSegmentBytes) {
          parts.push(newSegmentBytes);
        }
        currentPos = seg.start + seg.length;
      }
    }

    // Append remainder of file from currentPos
    if (currentPos < jpegBytes.length) {
      parts.push(jpegBytes.subarray(currentPos));
    }

    return concatUint8Arrays(parts);
  } else {
    // No existing matching segment. Insert it!
    // Insert after SOI (offset 2) or after existing Exif APP1 if present.
    if (!newSegmentBytes) {
      return jpegBytes; // nothing to remove, nothing to add
    }

    let insertOffset = 2; // right after SOI
    // If first segment is APP0 (JFIF) or APP1 (EXIF), insert after it
    if (segments.length > 0) {
      const firstSeg = segments[0];
      if (firstSeg.start === 2) {
        insertOffset = firstSeg.start + firstSeg.length;
      }
    }

    const before = jpegBytes.subarray(0, insertOffset);
    const after = jpegBytes.subarray(insertOffset);
    return concatUint8Arrays([before, newSegmentBytes, after]);
  }
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, curr) => acc + curr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
