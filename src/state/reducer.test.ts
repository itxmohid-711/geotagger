import { describe, it, expect, vi } from 'vitest';
import { appReducer, AppState, initialAppState } from './reducer';
import { ImageItem } from '@/types';

function createDummyImage(id: string, name: string, coords?: { lat: number; lng: number }): ImageItem {
  return {
    id,
    file: new File([], name, { type: 'image/jpeg' }),
    name,
    size: 1024,
    previewUrl: 'blob:test-' + id,
    status: 'ready',
    original: { coords, keywords: [] },
    edit: { coords, keywords: [] },
    stripGps: false,
    stripKeywords: false,
    stripText: false,
    dirty: false,
  };
}

describe('appReducer', () => {
  it('adds files and creates announcements', () => {
    const img1 = createDummyImage('1', 'photo1.jpg');
    const state = appReducer(initialAppState, {
      type: 'ADD_FILES',
      payload: [img1],
    });

    expect(state.images.length).toBe(1);
    expect(state.announcement).toBe('1 photo added.');
  });

  it('handles toggle select and multi select', () => {
    const img1 = createDummyImage('1', 'photo1.jpg');
    const img2 = createDummyImage('2', 'photo2.jpg');
    let state: AppState = {
      ...initialAppState,
      images: [img1, img2],
    };

    // Single toggle
    state = appReducer(state, { type: 'TOGGLE_SELECT', payload: { id: '1' } });
    expect(state.selectedIds.has('1')).toBe(true);
    expect(state.selectedIds.size).toBe(1);

    // Toggle another with multi=true
    state = appReducer(state, { type: 'TOGGLE_SELECT', payload: { id: '2', multi: true } });
    expect(state.selectedIds.has('1')).toBe(true);
    expect(state.selectedIds.has('2')).toBe(true);
    expect(state.selectedIds.size).toBe(2);
  });

  it('handles range select with shift key logic', () => {
    const images = [
      createDummyImage('1', '1.jpg'),
      createDummyImage('2', '2.jpg'),
      createDummyImage('3', '3.jpg'),
      createDummyImage('4', '4.jpg'),
    ];
    let state: AppState = {
      ...initialAppState,
      images,
      lastSelectedId: '1',
      selectedIds: new Set(['1']),
    };

    // Range select up to '3'
    state = appReducer(state, { type: 'RANGE_SELECT', payload: { targetId: '3' } });
    expect(state.selectedIds.size).toBe(3);
    expect(state.selectedIds.has('1')).toBe(true);
    expect(state.selectedIds.has('2')).toBe(true);
    expect(state.selectedIds.has('3')).toBe(true);
    expect(state.selectedIds.has('4')).toBe(false);
  });

  it('selects untagged photos only', () => {
    const images = [
      createDummyImage('1', 'tagged.jpg', { lat: 10, lng: 20 }),
      createDummyImage('2', 'untagged.jpg'),
    ];
    let state: AppState = {
      ...initialAppState,
      images,
    };

    state = appReducer(state, { type: 'SELECT_UNTAGGED' });
    expect(state.selectedIds.has('2')).toBe(true);
    expect(state.selectedIds.has('1')).toBe(false);
  });

  it('selects photos without alt text only', () => {
    const imgWithAlt = createDummyImage('1', 'with-alt.jpg');
    imgWithAlt.edit.altText = 'A scenic landscape';

    const imgWithoutAlt = createDummyImage('2', 'no-alt.jpg');
    imgWithoutAlt.edit.altText = undefined;

    const imgStrippedAlt = createDummyImage('3', 'stripped-alt.jpg');
    imgStrippedAlt.edit.altText = 'Existing text';
    imgStrippedAlt.stripText = true;

    let state: AppState = {
      ...initialAppState,
      images: [imgWithAlt, imgWithoutAlt, imgStrippedAlt],
    };

    state = appReducer(state, { type: 'SELECT_NO_ALT' });
    expect(state.selectedIds.has('2')).toBe(true);
    expect(state.selectedIds.has('3')).toBe(true);
    expect(state.selectedIds.has('1')).toBe(false);
  });

  it('revokes blob URLs on removeImages to avoid memory leaks', () => {
    if (!URL.revokeObjectURL) {
      URL.revokeObjectURL = vi.fn();
    }
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const img1 = createDummyImage('1', 'photo1.jpg');
    let state: AppState = {
      ...initialAppState,
      images: [img1],
      selectedIds: new Set(['1']),
    };

    state = appReducer(state, { type: 'REMOVE_IMAGES', payload: { ids: ['1'] } });
    expect(state.images.length).toBe(0);
    expect(revokeSpy).toHaveBeenCalledWith('blob:test-1');
    revokeSpy.mockRestore();
  });

  it('applies altText, caption, and extDescription with overwrite and fill-empty modes', () => {
    const img1 = createDummyImage('1', 'photo1.jpg');
    img1.edit.altText = 'Original Alt';
    let state: AppState = {
      ...initialAppState,
      images: [img1],
    };

    // fill-empty mode: does not overwrite existing altText, but fills caption and extDescription
    state = appReducer(state, {
      type: 'APPLY_TEXT',
      payload: {
        ids: ['1'],
        text: {
          altText: 'New Alt',
          caption: 'New Caption',
          extDescription: 'New Extended Description',
        },
        mode: 'fill-empty',
      },
    });

    expect(state.images[0].edit.altText).toBe('Original Alt');
    expect(state.images[0].edit.caption).toBe('New Caption');
    expect(state.images[0].edit.extDescription).toBe('New Extended Description');
    expect(state.images[0].dirty).toBe(true);
    expect(state.images[0].stripText).toBe(false);

    // overwrite mode: updates altText as well
    state = appReducer(state, {
      type: 'APPLY_TEXT',
      payload: {
        ids: ['1'],
        text: { altText: 'Overwritten Alt' },
        mode: 'overwrite',
      },
    });

    expect(state.images[0].edit.altText).toBe('Overwritten Alt');
  });

  it('updates stripText via SET_STRIP action', () => {
    const img1 = createDummyImage('1', 'photo1.jpg');
    let state: AppState = {
      ...initialAppState,
      images: [img1],
    };

    state = appReducer(state, {
      type: 'SET_STRIP',
      payload: { ids: ['1'], strip: { text: true } },
    });

    expect(state.images[0].stripText).toBe(true);
    expect(state.images[0].dirty).toBe(true);
  });
});
