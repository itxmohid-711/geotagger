'use client';

import React from 'react';
import { useApp } from '@/state/AppContext';

export function EditorPlaceholder() {
  const { state } = useApp();
  const selectedImages = state.images.filter((img) => state.selectedIds.has(img.id));
  const count = selectedImages.length;

  return (
    <section
      aria-label="Metadata and map editor panel"
      className="flex flex-col h-full min-h-[500px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-6"
    >
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Editor &amp; Map Workspace
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {count > 0
              ? `${count} photo${count === 1 ? '' : 's'} selected for editing`
              : 'Select one or more photos from the left to edit'}
          </p>
        </div>

        {count > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {count} selected
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3 shadow-xs">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>

        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Interactive Map &amp; Keyword Editor
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          {count > 0
            ? 'Map controls, address search, and keyword chip tagging are coming in the next parts.'
            : 'Select photos in the left grid to assign GPS coordinates and edit metadata.'}
        </p>

        {count > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-left max-w-sm w-full">
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Selected Photos:
            </span>
            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5 truncate">
              {selectedImages.slice(0, 4).map((img) => (
                <li key={img.id} className="truncate">
                  • {img.name}
                </li>
              ))}
              {selectedImages.length > 4 && (
                <li className="text-[11px] text-slate-400 italic">
                  + {selectedImages.length - 4} more
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
