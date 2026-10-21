import { Coordinates, ImageItem, ImageMeta, KeywordMode, TextMode } from '@/types';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  text: string;
}

export interface AppState {
  images: ImageItem[];
  selectedIds: Set<string>;
  lastSelectedId: string | null;
  announcement: string | null;
  toasts: ToastMessage[];
  history: ImageItem[] | null; // Previous snapshot for Undo
}

export type AppAction =
  | { type: 'ADD_FILES'; payload: ImageItem[] }
  | {
      type: 'SET_META';
      payload: {
        id: string;
        meta?: ImageMeta;
        status?: ImageItem['status'];
        error?: string;
        previewUrl?: string;
      };
    }
  | { type: 'TOGGLE_SELECT'; payload: { id: string; multi?: boolean } }
  | { type: 'RANGE_SELECT'; payload: { targetId: string } }
  | { type: 'SELECT_ALL' }
  | { type: 'SELECT_UNTAGGED' }
  | { type: 'SELECT_NO_ALT' }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'REMOVE_IMAGES'; payload: { ids?: string[] } }
  | { type: 'APPLY_COORDS'; payload: { ids: string[]; coords: Coordinates | null } }
  | {
      type: 'APPLY_KEYWORDS';
      payload: { ids: string[]; keywords: string[]; mode: KeywordMode };
    }
  | {
      type: 'APPLY_TEXT';
      payload: {
        ids: string[];
        text: { altText?: string; caption?: string; extDescription?: string };
        mode: TextMode;
      };
    }
  | {
      type: 'SET_STRIP';
      payload: { ids: string[]; strip: { gps?: boolean; keywords?: boolean; text?: boolean } };
    }
  | { type: 'MARK_EXPORTED'; payload: { ids: string[] } }
  | { type: 'SET_ANNOUNCEMENT'; payload: string | null }
  | { type: 'ADD_TOAST'; payload: Omit<ToastMessage, 'id'> }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'UNDO' };

export const initialAppState: AppState = {
  images: [],
  selectedIds: new Set<string>(),
  lastSelectedId: null,
  announcement: null,
  toasts: [],
  history: null,
};

function normalizeKeywords(kws: string[]): string[] {
  const seen = new Set<string>();
  const res: string[] = [];
  for (const k of kws) {
    const trimmed = k.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      res.push(trimmed);
    }
  }
  return res;
}

function cloneImages(images: ImageItem[]): ImageItem[] {
  return images.map((img) => ({
    ...img,
    original: {
      ...img.original,
      coords: img.original.coords ? { ...img.original.coords } : undefined,
      keywords: [...img.original.keywords],
    },
    edit: {
      ...img.edit,
      coords: img.edit.coords ? { ...img.edit.coords } : undefined,
      keywords: [...img.edit.keywords],
    },
  }));
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_FILES': {
      const newImages = [...state.images, ...action.payload];
      const count = action.payload.length;
      return {
        ...state,
        images: newImages,
        announcement: `${count} photo${count === 1 ? '' : 's'} added.`,
      };
    }

    case 'SET_META': {
      const { id, meta, status, error, previewUrl } = action.payload;
      const images = state.images.map((item) => {
        if (item.id !== id) return item;
        const updatedOriginal = meta ? { ...meta } : item.original;
        const updatedEdit = meta ? { ...meta } : item.edit;
        return {
          ...item,
          status: status !== undefined ? status : item.status,
          error: error !== undefined ? error : item.error,
          previewUrl: previewUrl || item.previewUrl,
          original: updatedOriginal,
          edit: updatedEdit,
        };
      });
      return { ...state, images };
    }

    case 'TOGGLE_SELECT': {
      const { id, multi } = action.payload;
      const newSelected = new Set(multi ? state.selectedIds : []);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return {
        ...state,
        selectedIds: newSelected,
        lastSelectedId: id,
      };
    }

    case 'RANGE_SELECT': {
      const { targetId } = action.payload;
      if (!state.lastSelectedId) {
        return {
          ...state,
          selectedIds: new Set([targetId]),
          lastSelectedId: targetId,
        };
      }

      const lastIdx = state.images.findIndex((img) => img.id === state.lastSelectedId);
      const targetIdx = state.images.findIndex((img) => img.id === targetId);

      if (lastIdx === -1 || targetIdx === -1) {
        return {
          ...state,
          selectedIds: new Set([targetId]),
          lastSelectedId: targetId,
        };
      }

      const start = Math.min(lastIdx, targetIdx);
      const end = Math.max(lastIdx, targetIdx);
      const newSelected = new Set(state.selectedIds);

      for (let i = start; i <= end; i++) {
        newSelected.add(state.images[i].id);
      }

      return {
        ...state,
        selectedIds: newSelected,
        lastSelectedId: targetId,
      };
    }

    case 'SELECT_ALL': {
      const allSelectable = state.images
        .filter((img) => img.status === 'ready' || img.status === 'loading')
        .map((img) => img.id);
      return {
        ...state,
        selectedIds: new Set(allSelectable),
      };
    }

    case 'SELECT_UNTAGGED': {
      const untagged = state.images
        .filter((img) => {
          if (img.status !== 'ready') return false;
          const hasCoords = !!img.edit.coords && !img.stripGps;
          return !hasCoords;
        })
        .map((img) => img.id);
      return {
        ...state,
        selectedIds: new Set(untagged),
      };
    }

    case 'SELECT_NO_ALT': {
      const noAlt = state.images
        .filter((img) => {
          if (img.status !== 'ready') return false;
          const hasAlt = !img.stripText && !!img.edit.altText?.trim();
          return !hasAlt;
        })
        .map((img) => img.id);
      return {
        ...state,
        selectedIds: new Set(noAlt),
      };
    }

    case 'CLEAR_SELECTION': {
      return {
        ...state,
        selectedIds: new Set<string>(),
        lastSelectedId: null,
      };
    }

    case 'REMOVE_IMAGES': {
      const idsToRemove = action.payload.ids
        ? new Set(action.payload.ids)
        : state.selectedIds;

      const remainingImages: ImageItem[] = [];
      for (const img of state.images) {
        if (idsToRemove.has(img.id)) {
          // Revoke thumbnail URL to prevent memory leaks
          if (img.previewUrl && img.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(img.previewUrl);
          }
        } else {
          remainingImages.push(img);
        }
      }

      const newSelected = new Set(
        Array.from(state.selectedIds).filter((id) => !idsToRemove.has(id))
      );

      return {
        ...state,
        images: remainingImages,
        selectedIds: newSelected,
        lastSelectedId:
          state.lastSelectedId && idsToRemove.has(state.lastSelectedId)
            ? null
            : state.lastSelectedId,
        announcement: `${idsToRemove.size} photo${idsToRemove.size === 1 ? '' : 's'} removed.`,
      };
    }

    case 'APPLY_COORDS': {
      const { ids, coords } = action.payload;
      const targetSet = new Set(ids);
      const snapshot = cloneImages(state.images);
      const images = state.images.map((img) => {
        if (!targetSet.has(img.id) || img.status !== 'ready') return img;
        const newCoords = coords ? { ...coords } : undefined;
        return {
          ...img,
          edit: {
            ...img.edit,
            coords: newCoords,
          },
          stripGps: false,
          dirty: true,
        };
      });
      return {
        ...state,
        images,
        history: snapshot,
        announcement: `Coordinates applied to ${ids.length} photo${ids.length === 1 ? '' : 's'}.`,
      };
    }

    case 'APPLY_KEYWORDS': {
      const { ids, keywords, mode } = action.payload;
      const targetSet = new Set(ids);
      const snapshot = cloneImages(state.images);
      const images = state.images.map((img) => {
        if (!targetSet.has(img.id) || img.status !== 'ready') return img;
        let merged: string[];
        if (mode === 'replace') {
          merged = normalizeKeywords(keywords);
        } else {
          merged = normalizeKeywords([...img.edit.keywords, ...keywords]);
        }
        return {
          ...img,
          edit: {
            ...img.edit,
            keywords: merged,
          },
          stripKeywords: false,
          dirty: true,
        };
      });
      return {
        ...state,
        images,
        history: snapshot,
        announcement: `Keywords applied to ${ids.length} photo${ids.length === 1 ? '' : 's'}.`,
      };
    }

    case 'APPLY_TEXT': {
      const { ids, text, mode } = action.payload;
      const targetSet = new Set(ids);
      const snapshot = cloneImages(state.images);
      const images = state.images.map((img) => {
        if (!targetSet.has(img.id) || img.status !== 'ready') return img;
        const currentEdit = img.edit;

        const updatedAlt =
          text.altText !== undefined
            ? mode === 'overwrite'
              ? text.altText
              : currentEdit.altText || text.altText
            : currentEdit.altText;

        const updatedCaption =
          text.caption !== undefined
            ? mode === 'overwrite'
              ? text.caption
              : currentEdit.caption || text.caption
            : currentEdit.caption;

        const updatedExtDesc =
          text.extDescription !== undefined
            ? mode === 'overwrite'
              ? text.extDescription
              : currentEdit.extDescription || text.extDescription
            : currentEdit.extDescription;

        return {
          ...img,
          edit: {
            ...currentEdit,
            altText: updatedAlt,
            caption: updatedCaption,
            extDescription: updatedExtDesc,
          },
          stripText: false,
          dirty: true,
        };
      });
      return {
        ...state,
        images,
        history: snapshot,
        announcement: `Text applied to ${ids.length} photo${ids.length === 1 ? '' : 's'}.`,
      };
    }

    case 'SET_STRIP': {
      const { ids, strip } = action.payload;
      const targetSet = new Set(ids);
      const snapshot = cloneImages(state.images);
      const images = state.images.map((img) => {
        if (!targetSet.has(img.id) || img.status !== 'ready') return img;
        return {
          ...img,
          stripGps: strip.gps !== undefined ? strip.gps : img.stripGps,
          stripKeywords:
            strip.keywords !== undefined ? strip.keywords : img.stripKeywords,
          stripText: strip.text !== undefined ? strip.text : img.stripText,
          dirty: true,
        };
      });
      return {
        ...state,
        images,
        history: snapshot,
        announcement: `Updated privacy strip flags for ${ids.length} photo${ids.length === 1 ? '' : 's'}.`,
      };
    }

    case 'MARK_EXPORTED': {
      const exportedSet = new Set(action.payload.ids);
      const images = state.images.map((img) => {
        if (!exportedSet.has(img.id)) return img;
        return {
          ...img,
          original: { ...img.edit },
          dirty: false,
        };
      });
      return { ...state, images };
    }

    case 'SET_ANNOUNCEMENT': {
      return {
        ...state,
        announcement: action.payload,
      };
    }

    case 'ADD_TOAST': {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const toast: ToastMessage = { id, ...action.payload };
      return {
        ...state,
        toasts: [...state.toasts.slice(-4), toast], // Keep max 5 toasts
      };
    }

    case 'REMOVE_TOAST': {
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload),
      };
    }

    case 'UNDO': {
      if (!state.history) return state;
      return {
        ...state,
        images: state.history,
        history: null,
        announcement: 'Last edit undone.',
      };
    }

    default:
      return state;
  }
}
