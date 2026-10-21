export interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  importance?: number;
}

// In-memory cache for queries and reverse lookups
const searchCache = new Map<string, NominatimResult[]>();
const reverseCache = new Map<string, string>();

let lastRequestTime = 0;

/**
 * Ensures at least 1000ms delay between consecutive Nominatim requests
 * to strictly adhere to the OpenStreetMap / Nominatim Usage Policy.
 */
async function rateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < 1000) {
    const delay = 1000 - timeSinceLast;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  lastRequestTime = Date.now();
}

/**
 * Searches places via Nominatim with rate limiting (1 req/sec) and in-memory caching.
 * Up to 5 results returned.
 */
export async function searchPlaces(query: string): Promise<NominatimResult[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  if (searchCache.has(normalized)) {
    return searchCache.get(normalized)!;
  }

  await rateLimit();

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(
    normalized
  )}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim search failed: ${response.status} ${response.statusText}`);
  }

  const data: NominatimResult[] = await response.json();
  searchCache.set(normalized, data);
  return data;
}

/**
 * Reverse geocodes coordinates to a human-readable place name.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (reverseCache.has(cacheKey)) {
    return reverseCache.get(cacheKey)!;
  }

  await rateLimit();

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Reverse geocode failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const displayName = data.display_name || 'Unknown location';
  reverseCache.set(cacheKey, displayName);
  return displayName;
}
