import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadPresets, savePreset, deletePreset } from './presets';

describe('Keyword Presets Storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('loads empty array when localStorage is empty', () => {
    expect(loadPresets()).toEqual([]);
  });

  it('saves and retrieves a new preset', () => {
    const updated = savePreset('Vacation', ['Beach', 'Sunset', 'Summer']);
    expect(updated.length).toBe(1);
    expect(updated[0].name).toBe('Vacation');
    expect(updated[0].keywords).toEqual(['Beach', 'Sunset', 'Summer']);

    const loaded = loadPresets();
    expect(loaded.length).toBe(1);
    expect(loaded[0].name).toBe('Vacation');
  });

  it('replaces preset if name exists case-insensitively', () => {
    savePreset('Work', ['Office']);
    const updated = savePreset('work', ['Office', 'Remote']);
    expect(updated.length).toBe(1);
    expect(updated[0].keywords).toEqual(['Office', 'Remote']);
  });

  it('deletes an existing preset by id', () => {
    const presets = savePreset('To Delete', ['tag1']);
    const id = presets[0].id;
    const remaining = deletePreset(id);
    expect(remaining.length).toBe(0);
    expect(loadPresets().length).toBe(0);
  });

  it('handles localStorage errors gracefully without throwing', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: Access Denied');
    });

    expect(() => loadPresets()).not.toThrow();
    expect(loadPresets()).toEqual([]);

    getItemSpy.mockRestore();
  });
});
