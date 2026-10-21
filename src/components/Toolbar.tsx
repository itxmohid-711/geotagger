'use client';

import React from 'react';
import { useApp } from '@/state/AppContext';
import {
  exportSingleImage,
  exportBatchZip,
  triggerFileDownload,
} from '@/lib/metadata/export';

import { PrivacyModal } from './PrivacyModal';

export function Toolbar() {
  const {
    state,
    selectAll,
    selectUntagged,
    selectNoAlt,
    clearSelection,
    removeImages,
    undo,
  } = useApp();

  const total = state.images.length;
  const selectedCount = state.selectedIds.size;

  if (total === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Image selection actions"
      className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {total} photo{total === 1 ? '' : 's'}
        </span>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {selectedCount} selected
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={selectAll}
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Select all photos"
        >
          Select all
        </button>

        <button
          type="button"
          onClick={selectUntagged}
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Select photos without coordinates"
        >
          Select untagged
        </button>

        <button
          type="button"
          onClick={selectNoAlt}
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Select photos without alt text"
        >
          Select photos without alt text
        </button>

        {selectedCount > 0 && (
          <>
            <button
              type="button"
              onClick={clearSelection}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Clear current selection"
            >
              Deselect
            </button>

            <button
              type="button"
              onClick={async () => {
                const selectedList = state.images.filter((img) => state.selectedIds.has(img.id));
                if (selectedList.length === 1) {
                  const res = await exportSingleImage(selectedList[0], false);
                  if (res.blob) triggerFileDownload(res.blob, res.outputName);
                } else if (selectedList.length > 1) {
                  await exportBatchZip(selectedList, false);
                }
              }}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 transition-colors"
              aria-label={`Download ${selectedCount} selected photo${selectedCount === 1 ? '' : 's'}`}
            >
              Download selected ({selectedCount})
            </button>

            <button
              type="button"
              onClick={() => removeImages()}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 transition-colors"
              aria-label={`Remove ${selectedCount} selected photo${selectedCount === 1 ? '' : 's'}`}
            >
              Remove selected ({selectedCount})
            </button>
          </>
        )}

        {state.history && (
          <button
            type="button"
            onClick={undo}
            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-100 transition-colors inline-flex items-center gap-1"
            aria-label="Undo last action"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a5 5 0 015 5v2m0 0l-4-4m4 4l4-4" />
            </svg>
            Undo
          </button>
        )}

        <button
          type="button"
          onClick={() => removeImages(state.images.map((i) => i.id))}
          className="px-2.5 py-1 text-xs font-medium rounded-md text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
          aria-label="Clear all photos from workspace"
        >
          Clear all
        </button>
      </div>

      <div className="w-full">
        <PrivacyModal />
      </div>
    </div>
  );
}
