'use client';

import React from 'react';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-800/80">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3.5 shadow-xs">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        No photos added yet
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
        Upload single photos or an entire folder of JPEGs above to inspect existing tags, edit coordinates, and manage keywords.
      </p>

      <div className="grid grid-cols-3 gap-2 mt-6 max-w-sm w-full text-left">
        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block mb-1">STEP 1</span>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">Drop or pick JPEG photos</p>
        </div>
        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block mb-1">STEP 2</span>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">Assign GPS or keywords</p>
        </div>
        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block mb-1">STEP 3</span>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">Export updated files</p>
        </div>
      </div>
    </div>
  );
}
