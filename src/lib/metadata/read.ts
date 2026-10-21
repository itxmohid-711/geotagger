import exifr from 'exifr';
import { ImageMeta, Coordinates } from '@/types';
import { readXmpKeywords, readXmpText } from './xmp';

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Normalizes, trims, and deduplicates keywords case-insensitively while preserving
 * original casing of first occurrence.
 */
export function normalizeKeywords(rawKeywords: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const kw of rawKeywords) {
    if (!kw || typeof kw !== 'string') continue;
    const trimmed = kw.trim();
    if (!trimmed) continue;
    const truncated = trimmed.length > 64 ? trimmed.slice(0, 64) : trimmed;
    const lower = truncated.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(truncated);
    }
  }

  return result;
}

/**
 * Reads GPS coordinates, date taken, keywords, alt text, caption, and extended description
 * from all standard metadata sources in a JPEG file.
 * - Alt text: XMP Iptc4xmpCore:AltTextAccessibility (prefers x-default, else first entry)
 * - Caption: XMP dc:description (rdf:Alt / x-default) falling back to EXIF ImageDescription
 * - Extended Description: XMP Iptc4xmpCore:ExtDescrAccessibility
 * Never throws on files without metadata.
 */
export async function readMetadata(
  file: File | Blob | ArrayBuffer | Uint8Array
): Promise<ImageMeta> {
  const rawKeywords: string[] = [];
  let coords: Coordinates | undefined;
  let dateTaken: string | undefined;
  let altText: string | undefined;
  let caption: string | undefined;
  let extDescription: string | undefined;

  let buffer: ArrayBuffer;
  if (file instanceof File || file instanceof Blob) {
    buffer = await file.arrayBuffer();
  } else if (file instanceof Uint8Array) {
    buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  } else {
    buffer = file;
  }

  const uint8 = new Uint8Array(buffer);

  // 1. Read directly from XMP via DOMParser (for keywords and accessibility text)
  try {
    const xmpList = readXmpKeywords(uint8);
    rawKeywords.push(...xmpList);

    const xmpText = readXmpText(uint8);
    altText = xmpText.altText;
    caption = xmpText.caption;
    extDescription = xmpText.extDescription;
  } catch {
    // ignore
  }

  // 2. Read metadata via exifr for GPS, Dates, IPTC, and EXIF fallbacks
  try {
    const parsed = await exifr.parse(buffer, {
      tiff: true,
      xmp: true,
      iptc: true,
      exif: true,
      gps: true,
      mergeOutput: true,
    });

    if (parsed) {
      // Coordinates
      if (
        typeof parsed.latitude === 'number' &&
        typeof parsed.longitude === 'number' &&
        !isNaN(parsed.latitude) &&
        !isNaN(parsed.longitude)
      ) {
        coords = {
          lat: parsed.latitude,
          lng: parsed.longitude,
          alt: typeof parsed.altitude === 'number' && !isNaN(parsed.altitude) ? parsed.altitude : undefined,
        };
      }

      // Date taken
      if (parsed.DateTimeOriginal instanceof Date) {
        dateTaken = parsed.DateTimeOriginal.toISOString();
      } else if (typeof parsed.DateTimeOriginal === 'string') {
        dateTaken = parsed.DateTimeOriginal;
      } else if (parsed.CreateDate instanceof Date) {
        dateTaken = parsed.CreateDate.toISOString();
      }

      // IPTC keywords
      if (Array.isArray(parsed.Keywords)) {
        for (const item of parsed.Keywords) {
          if (typeof item === 'string') rawKeywords.push(decodeXmlEntities(item));
        }
      } else if (typeof parsed.Keywords === 'string') {
        rawKeywords.push(decodeXmlEntities(parsed.Keywords));
      }

      // XMP subject / keywords if read by exifr
      if (Array.isArray(parsed.subject)) {
        for (const s of parsed.subject) {
          if (typeof s === 'string') rawKeywords.push(decodeXmlEntities(s));
        }
      } else if (typeof parsed.subject === 'string') {
        rawKeywords.push(decodeXmlEntities(parsed.subject));
      }

      // EXIF XPKeywords
      if (typeof parsed.XPKeywords === 'string') {
        const split = parsed.XPKeywords.split(';');
        for (const item of split) {
          if (item) rawKeywords.push(item);
        }
      } else if (Array.isArray(parsed.XPKeywords)) {
        for (const item of parsed.XPKeywords) {
          if (typeof item === 'string') rawKeywords.push(item);
        }
      }

      // Caption fallback: if no XMP caption was found, fall back to EXIF ImageDescription
      if (!caption && typeof parsed.ImageDescription === 'string' && parsed.ImageDescription.trim()) {
        caption = parsed.ImageDescription.trim();
      }

      // Additional exifr fallback for description
      if (!caption && typeof parsed.description === 'string' && parsed.description.trim()) {
        caption = decodeXmlEntities(parsed.description.trim());
      }
    }
  } catch {
    // files without metadata or parse warnings
  }

  return {
    coords,
    keywords: normalizeKeywords(rawKeywords),
    dateTaken,
    altText,
    caption,
    extDescription,
  };
}
