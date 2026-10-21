import { Coordinates } from '@/types';

export interface DMSResult {
  deg: number;
  min: number;
  sec: number;
  ref: 'N' | 'S' | 'E' | 'W';
}

/**
 * Converts decimal degrees to degrees, minutes, seconds and direction reference.
 */
export function decimalToDms(value: number, axis: 'lat' | 'lng'): DMSResult {
  if (isNaN(value)) {
    throw new Error('Coordinate value cannot be NaN');
  }

  let ref: 'N' | 'S' | 'E' | 'W';
  if (axis === 'lat') {
    ref = value >= 0 ? 'N' : 'S';
  } else {
    ref = value >= 0 ? 'E' : 'W';
  }

  const absolute = Math.abs(value);
  const deg = Math.floor(absolute);
  const minFloat = (absolute - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;

  return { deg, min, sec, ref };
}

/**
 * Converts degrees, minutes, seconds and direction reference to decimal degrees.
 */
export function dmsToDecimal(
  deg: number,
  min: number,
  sec: number,
  ref: 'N' | 'S' | 'E' | 'W'
): number {
  if (isNaN(deg) || isNaN(min) || isNaN(sec)) {
    throw new Error('DMS parts cannot be NaN');
  }
  const decimal = deg + min / 60 + sec / 3600;
  return ref === 'S' || ref === 'W' ? -decimal : decimal;
}

/**
 * Validates that latitude and longitude are within acceptable bounds.
 */
export function validateCoordinates(lat: number, lng: number): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

/**
 * Parses coordinates in various formats:
 * - "31.5204, 74.3587" or "31.5204,74.3587" (Google Maps format)
 * - "31.5204 74.3587"
 * - "31.5204N 74.3587E" or "31.5204S, 74.3587W"
 * - DMS like: 31°31'13.4"N 74°21'31.3"E, 31° 31' 13.4" N, 74° 21' 31.3" E
 */
export function parseCoordinates(input: string): Coordinates | null {
  if (!input || typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;

  // 1. Check for DMS pattern:
  // e.g. 31°31'13.4"N 74°21'31.3"E or 31° 31' 13.4" N, 74° 21' 31.3" E
  const dmsRegex =
    /(\d+)\s*°\s*(\d+)\s*['′]\s*([\d.]+)\s*["″]?\s*([NSns])[, \t]+(\d+)\s*°\s*(\d+)\s*['′]\s*([\d.]+)\s*["″]?\s*([EWew])/;
  const dmsMatch = raw.match(dmsRegex);
  if (dmsMatch) {
    const latDeg = parseFloat(dmsMatch[1]);
    const latMin = parseFloat(dmsMatch[2]);
    const latSec = parseFloat(dmsMatch[3]);
    const latRef = dmsMatch[4].toUpperCase() as 'N' | 'S';

    const lngDeg = parseFloat(dmsMatch[5]);
    const lngMin = parseFloat(dmsMatch[6]);
    const lngSec = parseFloat(dmsMatch[7]);
    const lngRef = dmsMatch[8].toUpperCase() as 'E' | 'W';

    const lat = dmsToDecimal(latDeg, latMin, latSec, latRef);
    const lng = dmsToDecimal(lngDeg, lngMin, lngSec, lngRef);

    if (validateCoordinates(lat, lng)) {
      return { lat, lng };
    }
  }

  // 2. Check for Decimal degrees with hemisphere reference:
  // e.g. "31.5204N 74.3587E" or "31.5204N, 74.3587W"
  const refDecimalRegex =
    /^([+-]?\d+(?:\.\d+)?)\s*([NSns])[, \t]+([+-]?\d+(?:\.\d+)?)\s*([EWew])$/;
  const refMatch = raw.match(refDecimalRegex);
  if (refMatch) {
    let lat = Math.abs(parseFloat(refMatch[1]));
    if (refMatch[2].toUpperCase() === 'S') lat = -lat;
    let lng = Math.abs(parseFloat(refMatch[3]));
    if (refMatch[4].toUpperCase() === 'W') lng = -lng;

    if (validateCoordinates(lat, lng)) {
      return { lat, lng };
    }
  }

  // 3. Decimal degrees: comma or space separated
  // e.g. "31.5204, 74.3587", "31.5204 74.3587", "31.5204,-74.3587"
  const decRegex = /^([+-]?\d+(?:\.\d+)?)[,\s]+([+-]?\d+(?:\.\d+)?)$/;
  const decMatch = raw.match(decRegex);
  if (decMatch) {
    const lat = parseFloat(decMatch[1]);
    const lng = parseFloat(decMatch[2]);
    if (validateCoordinates(lat, lng)) {
      return { lat, lng };
    }
  }

  return null;
}
