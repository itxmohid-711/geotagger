import { describe, it, expect } from 'vitest';
import {
  decimalToDms,
  dmsToDecimal,
  parseCoordinates,
  validateCoordinates,
} from './coords';

describe('coords.ts', () => {
  it('converts decimal to DMS accurately', () => {
    const latDms = decimalToDms(31.5204, 'lat');
    expect(latDms.ref).toBe('N');
    expect(latDms.deg).toBe(31);
    expect(latDms.min).toBe(31);
    expect(latDms.sec).toBeCloseTo(13.44, 2);

    const southLat = decimalToDms(-33.8688, 'lat');
    expect(southLat.ref).toBe('S');
    expect(southLat.deg).toBe(33);
    expect(southLat.min).toBe(52);

    const westLng = decimalToDms(-74.006, 'lng');
    expect(westLng.ref).toBe('W');
    expect(westLng.deg).toBe(74);
    expect(westLng.min).toBe(0);
    expect(westLng.sec).toBeCloseTo(21.6, 2);
  });

  it('round-trips decimal to DMS and back within 1e-6', () => {
    const testCases = [
      { val: 31.5204, axis: 'lat' as const },
      { val: -33.8688, axis: 'lat' as const },
      { val: 74.3587, axis: 'lng' as const },
      { val: -118.2437, axis: 'lng' as const },
      { val: 0.0, axis: 'lat' as const },
    ];

    for (const { val, axis } of testCases) {
      const dms = decimalToDms(val, axis);
      const restored = dmsToDecimal(dms.deg, dms.min, dms.sec, dms.ref);
      expect(Math.abs(restored - val)).toBeLessThan(1e-6);
    }
  });

  it('validates coordinate bounds correctly', () => {
    expect(validateCoordinates(0, 0)).toBe(true);
    expect(validateCoordinates(90, 180)).toBe(true);
    expect(validateCoordinates(-90, -180)).toBe(true);
    expect(validateCoordinates(90.1, 0)).toBe(false);
    expect(validateCoordinates(0, 180.1)).toBe(false);
    expect(validateCoordinates(NaN, 50)).toBe(false);
    expect(validateCoordinates(50, NaN)).toBe(false);
  });

  it('parses coordinates in various accepted formats', () => {
    // 1. Google Maps comma format
    const parsed1 = parseCoordinates('31.5204, 74.3587');
    expect(parsed1).not.toBeNull();
    expect(parsed1!.lat).toBeCloseTo(31.5204, 4);
    expect(parsed1!.lng).toBeCloseTo(74.3587, 4);

    // 2. Space separated format
    const parsed2 = parseCoordinates('31.5204 74.3587');
    expect(parsed2).not.toBeNull();
    expect(parsed2!.lat).toBeCloseTo(31.5204, 4);
    expect(parsed2!.lng).toBeCloseTo(74.3587, 4);

    // 3. Decimal with hemisphere letter
    const parsed3 = parseCoordinates('31.5204N 74.3587E');
    expect(parsed3).not.toBeNull();
    expect(parsed3!.lat).toBeCloseTo(31.5204, 4);
    expect(parsed3!.lng).toBeCloseTo(74.3587, 4);

    const parsed3SouthWest = parseCoordinates('33.8688S 74.0060W');
    expect(parsed3SouthWest).not.toBeNull();
    expect(parsed3SouthWest!.lat).toBeCloseTo(-33.8688, 4);
    expect(parsed3SouthWest!.lng).toBeCloseTo(-74.006, 4);

    // 4. DMS format: 31°31'13.4"N 74°21'31.3"E
    const parsed4 = parseCoordinates('31°31\'13.4"N 74°21\'31.3"E');
    expect(parsed4).not.toBeNull();
    expect(parsed4!.lat).toBeCloseTo(31.520388, 4);
    expect(parsed4!.lng).toBeCloseTo(74.358694, 4);
  });

  it('rejects invalid coordinate inputs', () => {
    expect(parseCoordinates('')).toBeNull();
    expect(parseCoordinates('random text')).toBeNull();
    expect(parseCoordinates('999.0, 999.0')).toBeNull();
    expect(parseCoordinates('31.5204')).toBeNull();
    expect(parseCoordinates('31.5204, abc')).toBeNull();
  });
});
