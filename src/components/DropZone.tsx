'use client';

import React, { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { useApp } from '@/state/AppContext';

export function DropZone() {
  const { addFiles } = useApp();
  const [isDragOver, setIsDragOver] = useState(false);
  const [largeFilesWarning, setLargeFilesWarning] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const checkFileSize = (files: File[]) => {
    const largeFiles = files.filter((f) => f.size > 40 * 1024 * 1024);
    if (largeFiles.length > 0) {
      setLargeFilesWarning(
        `Warning: ${largeFiles.length} file(s) are over 40 MB (${largeFiles
          .map((f) => f.name)
          .slice(0, 2)
          .join(', ')}${largeFiles.length > 2 ? '...' : ''}). They may take longer to process.`
      );
    } else {
      setLargeFilesWarning(null);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      checkFileSize(files);
      addFiles(files);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      checkFileSize(files);
      addFiles(files);
      e.target.value = '';
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center p-6 text-center border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 ring-4 ring-blue-500/20'
            : 'border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 hover:border-blue-400 hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
        }`}
        role="region"
        aria-label="Photo upload area"
      >
        <div className="w-12 h-12 mb-3 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center pointer-events-none">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Drag &amp; drop your JPEG photos here
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          Supports .jpg and .jpeg. All metadata processing happens directly in your browser.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-xs"
            aria-label="Choose photos from your computer"
          >
            Choose photos
          </button>

          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all border border-slate-200 dark:border-slate-700"
            aria-label="Choose entire folder from your computer"
          >
            Choose folder
          </button>
        </div>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,image/jpeg"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={folderInputRef}
          type="file"
          {...{ webkitdirectory: '', directory: '' }}
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {largeFilesWarning && (
        <div
          role="alert"
          className="mt-3 p-2.5 text-xs rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 flex items-center gap-2"
        >
          <svg className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{largeFilesWarning}</span>
        </div>
      )}
    </div>
  );
}
