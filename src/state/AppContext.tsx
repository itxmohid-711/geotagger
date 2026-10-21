'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, AppAction, initialAppState, appReducer, ToastMessage } from './reducer';
import { readMetadata } from '@/lib/metadata/read';
import { Coordinates, ImageItem, KeywordMode, TextMode } from '@/types';

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  addFiles: (files: File[]) => void;
  toggleSelect: (id: string, multi?: boolean) => void;
  rangeSelect: (targetId: string) => void;
  selectAll: () => void;
  selectUntagged: () => void;
  selectNoAlt: () => void;
  clearSelection: () => void;
  removeImages: (ids?: string[]) => void;
  applyCoords: (ids: string[], coords: Coordinates | null) => void;
  applyKeywords: (ids: string[], keywords: string[], mode: KeywordMode) => void;
  applyText: (
    ids: string[],
    text: { altText?: string; caption?: string; extDescription?: string },
    mode: TextMode
  ) => void;
  setStrip: (ids: string[], strip: { gps?: boolean; keywords?: boolean; text?: boolean }) => void;
  markExported: (ids: string[]) => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  undo: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

/**
 * Creates a low-res thumbnail blob preview (max 320px) DISPLAY ONLY.
 * Uses createImageBitmap if available, falls back to Image + Canvas.
 */
async function generateThumbnailPreview(file: File): Promise<string> {
  const maxDim = 320;

  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file);
      let { width, height } = bitmap;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        return new Promise<string>((resolve) => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(URL.createObjectURL(blob));
              } else {
                resolve(URL.createObjectURL(file));
              }
            },
            'image/jpeg',
            0.8
          );
        });
      }
      bitmap.close();
    } catch {
      // Fallback
    }
  }

  // Fallback: direct object URL
  return URL.createObjectURL(file);
}

/**
 * Concurrency runner for processing tasks with a limit of maxConcurrent.
 */
async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>
): Promise<void> {
  let index = 0;
  const executing: Promise<void>[] = [];

  async function next(): Promise<void> {
    if (index >= items.length) return;
    const item = items[index++];
    const p = task(item).then(() => {
      executing.splice(executing.indexOf(p), 1);
    });
    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
    await next();
  }

  const initialBatch = [];
  while (initialBatch.length < limit && index < items.length) {
    initialBatch.push(next());
  }
  await Promise.all(initialBatch);
  await Promise.all(executing);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialAppState);

  // Revoke any remaining preview URLs when component unmounts
  useEffect(() => {
    return () => {
      state.images.forEach((img) => {
        if (img.previewUrl && img.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
    };
  }, [state.images]);

  const addFiles = (files: File[]) => {
    if (!files.length) return;

    const newItems: ImageItem[] = [];
    const validJpegs: { file: File; id: string }[] = [];

    for (const file of files) {
      const id = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const ext = file.name.split('.').pop()?.toLowerCase();
      const isJpegExt = ext === 'jpg' || ext === 'jpeg';
      const isJpegMime = file.type === 'image/jpeg';

      if (!isJpegExt && !isJpegMime) {
        // Unsupported format: show clear message, do not drop silently
        const detectedType = ext ? ext.toUpperCase() : 'This format';
        newItems.push({
          id,
          file,
          name: file.name,
          size: file.size,
          previewUrl: '',
          status: 'unsupported',
          error: `${detectedType} isn't supported yet (v1 supports JPEG only)`,
          original: { keywords: [] },
          edit: { keywords: [] },
          stripGps: false,
          stripKeywords: false,
          stripText: false,
          dirty: false,
        });
      } else {
        newItems.push({
          id,
          file,
          name: file.name,
          size: file.size,
          previewUrl: '',
          status: 'loading',
          original: { keywords: [] },
          edit: { keywords: [] },
          stripGps: false,
          stripKeywords: false,
          stripText: false,
          dirty: false,
        });
        validJpegs.push({ file, id });
      }
    }

    dispatch({ type: 'ADD_FILES', payload: newItems });

    // Process valid JPEGs with concurrency limit of 4
    if (validJpegs.length > 0) {
      runWithConcurrency(validJpegs, 4, async ({ file, id }) => {
        try {
          const [meta, previewUrl] = await Promise.all([
            readMetadata(file),
            generateThumbnailPreview(file),
          ]);

          dispatch({
            type: 'SET_META',
            payload: {
              id,
              meta,
              previewUrl,
              status: 'ready',
            },
          });
        } catch (err) {
          const previewUrl = URL.createObjectURL(file);
          dispatch({
            type: 'SET_META',
            payload: {
              id,
              previewUrl,
              status: 'error',
              error: err instanceof Error ? err.message : 'Failed to read metadata',
            },
          });
        }
      });
    }
  };

  const toggleSelect = (id: string, multi?: boolean) => {
    dispatch({ type: 'TOGGLE_SELECT', payload: { id, multi } });
  };

  const rangeSelect = (targetId: string) => {
    dispatch({ type: 'RANGE_SELECT', payload: { targetId } });
  };

  const selectAll = () => {
    dispatch({ type: 'SELECT_ALL' });
  };

  const selectUntagged = () => {
    dispatch({ type: 'SELECT_UNTAGGED' });
  };

  const selectNoAlt = () => {
    dispatch({ type: 'SELECT_NO_ALT' });
  };

  const clearSelection = () => {
    dispatch({ type: 'CLEAR_SELECTION' });
  };

  const removeImages = (ids?: string[]) => {
    dispatch({ type: 'REMOVE_IMAGES', payload: { ids } });
  };

  const applyCoords = (ids: string[], coords: Coordinates | null) => {
    dispatch({ type: 'APPLY_COORDS', payload: { ids, coords } });
  };

  const applyKeywords = (ids: string[], keywords: string[], mode: KeywordMode) => {
    dispatch({ type: 'APPLY_KEYWORDS', payload: { ids, keywords, mode } });
  };

  const applyText = (
    ids: string[],
    text: { altText?: string; caption?: string; extDescription?: string },
    mode: TextMode
  ) => {
    dispatch({ type: 'APPLY_TEXT', payload: { ids, text, mode } });
  };

  const setStrip = (ids: string[], strip: { gps?: boolean; keywords?: boolean; text?: boolean }) => {
    dispatch({ type: 'SET_STRIP', payload: { ids, strip } });
  };

  const markExported = (ids: string[]) => {
    dispatch({ type: 'MARK_EXPORTED', payload: { ids } });
  };

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    dispatch({ type: 'ADD_TOAST', payload: toast });
  };

  const removeToast = (id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  };

  const undo = () => {
    dispatch({ type: 'UNDO' });
    addToast({ type: 'info', text: 'Last action undone.' });
  };

  // Warn on unsaved changes via beforeunload
  useEffect(() => {
    const hasDirty = state.images.some((img) => img.dirty);
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.images]);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        addFiles,
        toggleSelect,
        rangeSelect,
        selectAll,
        selectUntagged,
        selectNoAlt,
        clearSelection,
        removeImages,
        applyCoords,
        applyKeywords,
        applyText,
        setStrip,
        markExported,
        addToast,
        removeToast,
        undo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
