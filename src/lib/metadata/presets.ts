export interface KeywordPreset {
  id: string;
  name: string;
  keywords: string[];
}

const STORAGE_KEY = 'geotagger_keyword_presets';

export function loadPresets(): KeywordPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePreset(name: string, keywords: string[]): KeywordPreset[] {
  const current = loadPresets();
  const trimmedName = name.trim();
  if (!trimmedName || keywords.length === 0) return current;

  // Filter out any existing preset with same name
  const filtered = current.filter((p) => p.name.toLowerCase() !== trimmedName.toLowerCase());
  const newPreset: KeywordPreset = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: trimmedName,
    keywords,
  };

  const updated = [...filtered, newPreset];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // LocalStorage quota or access denied
  }
  return updated;
}

export function deletePreset(id: string): KeywordPreset[] {
  const current = loadPresets();
  const updated = current.filter((p) => p.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // LocalStorage error handling
  }
  return updated;
}
