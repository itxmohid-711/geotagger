import piexif, { type ExifDict } from 'piexifjs';
import { Coordinates } from '@/types';
import { decimalToDms } from '../geo/coords';
import { arrayBufferToBinaryString, binaryStringToUint8Array } from './bytes';
import {
  writeXmpMetadata,
  normalizeAltText,
  normalizeCaption,
  normalizeExtDescription,
  isPureAscii,
  XmpTextOptions,
} from './xmp';
import { normalizeKeywords, readMetadata } from './read';
import { isJpeg } from './jpeg';

export interface WriteMetadataOptions {
  coords?: Coordinates | null;
  keywords?: string[] | null;
  altText?: string | null;
  caption?: string | null;
  extDescription?: string | null;
  stripGps?: boolean;
  stripKeywords?: boolean;
  stripText?: boolean;
}

export interface WriteMetadataResult {
  blob: Blob;
  verified: boolean;
  warnings: string[];
}

/**
 * Converts a string into UTF-16LE byte array for EXIF XP tags (like XPKeywords).
 * Ends with two zero bytes (null terminator).
 */
function stringToUtf16LeBytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    bytes.push(code & 0xff);
    bytes.push((code >> 8) & 0xff);
  }
  bytes.push(0);
  bytes.push(0);
  return bytes;
}

/**
 * Checks whether written coordinates match the target coordinates within 1e-5.
 */
function areCoordsEqual(a?: Coordinates, b?: Coordinates | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return Math.abs(a.lat - b.lat) < 1e-5 && Math.abs(a.lng - b.lng) < 1e-5;
}

/**
 * Checks whether written keywords match expected keywords (case-insensitively).
 */
function areKeywordsEqual(actual: string[], expected: string[]): boolean {
  const actualSet = new Set(actual.map((k) => k.toLowerCase()));
  const expectedSet = new Set(expected.map((k) => k.toLowerCase()));
  if (actualSet.size !== expectedSet.size) return false;
  for (const item of expectedSet) {
    if (!actualSet.has(item)) return false;
  }
  return true;
}

/**
 * Writes GPS coordinates, keywords, alt text, caption, and extended description to a JPEG
 * file's metadata segments (EXIF + XMP) in a single-pass rewrite without re-encoding pixel data.
 */
export async function writeMetadata(
  file: File | Blob,
  opts: WriteMetadataOptions
): Promise<WriteMetadataResult> {
  const buffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(buffer);
  const warnings: string[] = [];

  if (!isJpeg(uint8)) {
    throw new Error('Only JPEG images (.jpg, .jpeg) are supported.');
  }

  // 1. Process EXIF metadata (GPS, XPKeywords, and ImageDescription) via piexifjs
  const binaryStr = arrayBufferToBinaryString(uint8.buffer as ArrayBuffer);
  let exifObj: ExifDict;

  try {
    exifObj = piexif.load(binaryStr);
  } catch {
    exifObj = { '0th': {}, Exif: {}, GPS: {}, Interop: {}, '1st': {}, thumbnail: null };
  }

  if (!exifObj['0th']) exifObj['0th'] = {};
  if (!exifObj.Exif) exifObj.Exif = {};
  if (!exifObj.GPS) exifObj.GPS = {};

  // Handle GPS
  if (opts.stripGps) {
    exifObj.GPS = {};
  } else if (opts.coords) {
    const { lat, lng, alt } = opts.coords;
    const latDms = decimalToDms(lat, 'lat');
    const lngDms = decimalToDms(lng, 'lng');

    const latSecInt = Math.round(latDms.sec * 100);
    const lngSecInt = Math.round(lngDms.sec * 100);

    exifObj.GPS = {
      [piexif.GPSIFD.GPSVersionID]: [2, 0, 0, 0],
      [piexif.GPSIFD.GPSLatitudeRef]: latDms.ref,
      [piexif.GPSIFD.GPSLatitude]: [
        [latDms.deg, 1],
        [latDms.min, 1],
        [latSecInt, 100],
      ],
      [piexif.GPSIFD.GPSLongitudeRef]: lngDms.ref,
      [piexif.GPSIFD.GPSLongitude]: [
        [lngDms.deg, 1],
        [lngDms.min, 1],
        [lngSecInt, 100],
      ],
    };

    if (typeof alt === 'number' && !isNaN(alt)) {
      exifObj.GPS[piexif.GPSIFD.GPSAltitudeRef] = alt < 0 ? 1 : 0;
      exifObj.GPS[piexif.GPSIFD.GPSAltitude] = [Math.round(Math.abs(alt) * 100), 100];
    }
  }

  // Handle Keywords in EXIF (XPKeywords: tag 0x9c9e / 40094 in 0th / ImageIFD)
  let normalizedKws: string[] | null = null;
  if (opts.stripKeywords) {
    delete exifObj['0th'][piexif.ImageIFD.XPKeywords];
  } else if (opts.keywords !== undefined && opts.keywords !== null) {
    normalizedKws = normalizeKeywords(opts.keywords);
    if (normalizedKws.length > 0) {
      const xpKeywordsStr = normalizedKws.join(';');
      const utf16Bytes = stringToUtf16LeBytes(xpKeywordsStr);
      exifObj['0th'][piexif.ImageIFD.XPKeywords] = utf16Bytes;
    } else {
      delete exifObj['0th'][piexif.ImageIFD.XPKeywords];
    }
  }

  // Handle Text in EXIF ImageDescription (caption only)
  // Rule: Do NOT write alt text into EXIF ImageDescription.
  // Rule: Write caption ONLY if pure ASCII. If non-ASCII, skip EXIF copy, keep in XMP, and issue a warning.
  const normCaption = opts.stripText ? null : normalizeCaption(opts.caption);
  const normAltText = opts.stripText ? null : normalizeAltText(opts.altText);
  const normExtDesc = opts.stripText ? null : normalizeExtDescription(opts.extDescription);

  if (opts.stripText) {
    delete exifObj['0th'][piexif.ImageIFD.ImageDescription];
  } else if (opts.caption !== undefined) {
    if (normCaption) {
      if (isPureAscii(normCaption)) {
        exifObj['0th'][piexif.ImageIFD.ImageDescription] = normCaption;
      } else {
        delete exifObj['0th'][piexif.ImageIFD.ImageDescription];
        warnings.push(
          'Caption contains non-ASCII characters; written to XMP dc:description only (omitted from legacy EXIF ImageDescription).'
        );
      }
    } else {
      delete exifObj['0th'][piexif.ImageIFD.ImageDescription];
    }
  }

  // Dump EXIF and insert into JPEG bytes
  let exifBytesStr: string;
  try {
    exifBytesStr = piexif.dump(exifObj);
  } catch {
    exifObj.thumbnail = null;
    exifBytesStr = piexif.dump(exifObj);
  }

  const newBinaryStr = piexif.insert(exifBytesStr, binaryStr);
  let finalBytes: Uint8Array = binaryStringToUint8Array(newBinaryStr);

  // 2. Process XMP metadata (combining keywords + text in ONE single XMP rewrite)
  const xmpTextOpts: XmpTextOptions = {};
  let shouldUpdateXmp = false;

  if (opts.stripText) {
    xmpTextOpts.altText = null;
    xmpTextOpts.caption = null;
    xmpTextOpts.extDescription = null;
    shouldUpdateXmp = true;
  } else {
    if (opts.altText !== undefined) {
      xmpTextOpts.altText = normAltText || null;
      shouldUpdateXmp = true;
    }
    if (opts.caption !== undefined) {
      xmpTextOpts.caption = normCaption || null;
      shouldUpdateXmp = true;
    }
    if (opts.extDescription !== undefined) {
      xmpTextOpts.extDescription = normExtDesc || null;
      shouldUpdateXmp = true;
    }
  }

  let finalKeywords: string[] | undefined = undefined;
  if (opts.stripKeywords) {
    finalKeywords = [];
    shouldUpdateXmp = true;
  } else if (opts.keywords !== undefined && opts.keywords !== null) {
    finalKeywords = normalizedKws || [];
    shouldUpdateXmp = true;
  }

  if (shouldUpdateXmp) {
    finalBytes = writeXmpMetadata(finalBytes, {
      keywords: finalKeywords,
      text: xmpTextOpts,
    });
  }

  const resultBlob = new Blob([finalBytes.buffer as ArrayBuffer], { type: 'image/jpeg' });

  // 3. Re-read and verify output
  let verified = true;
  try {
    const verifiedMeta = await readMetadata(resultBlob);

    // Verify GPS
    if (opts.stripGps) {
      if (verifiedMeta.coords) verified = false;
    } else if (opts.coords) {
      if (!areCoordsEqual(verifiedMeta.coords, opts.coords)) {
        verified = false;
      }
    }

    // Verify Keywords
    if (opts.stripKeywords) {
      if (verifiedMeta.keywords.length > 0) verified = false;
    } else if (opts.keywords !== undefined && opts.keywords !== null) {
      if (!areKeywordsEqual(verifiedMeta.keywords, normalizedKws || [])) {
        verified = false;
      }
    }

    // Verify Text fields
    if (opts.stripText) {
      if (verifiedMeta.altText || verifiedMeta.caption || verifiedMeta.extDescription) {
        verified = false;
      }
    } else {
      if (opts.altText !== undefined) {
        const expected = normAltText || undefined;
        if (verifiedMeta.altText !== expected) verified = false;
      }
      if (opts.caption !== undefined) {
        const expected = normCaption || undefined;
        if (verifiedMeta.caption !== expected) verified = false;
      }
      if (opts.extDescription !== undefined) {
        const expected = normExtDesc || undefined;
        if (verifiedMeta.extDescription !== expected) verified = false;
      }
    }
  } catch {
    verified = false;
  }

  return {
    blob: resultBlob,
    verified,
    warnings,
  };
}
