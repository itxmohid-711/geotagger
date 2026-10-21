'use client';

import React, { MouseEvent, KeyboardEvent } from 'react';
import { ImageItem } from '@/types';
import { useApp } from '@/state/AppContext';
import { exportSingleImage, triggerFileDownload } from '@/lib/metadata/export';

interface ImageCardProps {
  image: ImageItem;
  isSelected: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function ImageCard({ image, isSelected }: ImageCardProps) {
  const { toggleSelect, rangeSelect, removeImages, applyText, addToast } = useApp();

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.shiftKey) {
      e.preventDefault();
      rangeSelect(image.id);
    } else if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      toggleSelect(image.id, true);
    } else {
      // Toggle single item or toggle in current selection
      toggleSelect(image.id, false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        rangeSelect(image.id);
      } else {
        toggleSelect(image.id, e.metaKey || e.ctrlKey);
      }
    }
  };

  const hasCoords = !image.stripGps && !!image.edit.coords;
  const keywordCount = image.stripKeywords ? 0 : image.edit.keywords.length;
  const hasAltText = !image.stripText && !!image.edit.altText?.trim();

  return (
    <div
      role="checkbox"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`group relative flex flex-col rounded-xl overflow-hidden border transition-all duration-150 select-none cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
        isSelected
          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500/40 shadow-sm'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
      aria-label={`Photo ${image.name}, ${formatBytes(image.size)}, ${
        hasCoords ? 'with GPS' : 'no GPS'
      }, ${keywordCount} keywords, ${hasAltText ? 'with alt text' : 'no alt text'}`}
    >
      {/* Thumbnail Aspect Container */}
      <div className="relative aspect-4/3 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
        {image.status === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-2 p-3 text-slate-400">
            <svg
              className="animate-spin h-6 w-6 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span className="text-[11px]">Reading...</span>
          </div>
        )}

        {image.status === 'unsupported' && (
          <div className="flex flex-col items-center justify-center p-3 text-center text-amber-600 dark:text-amber-400 gap-1.5">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-[11px] font-medium leading-tight">
              {image.error || 'Unsupported file'}
            </span>
          </div>
        )}

        {image.status === 'error' && (
          <div className="flex flex-col items-center justify-center p-3 text-center text-rose-600 dark:text-rose-400 gap-1.5">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[11px] font-medium leading-tight">
              {image.error || 'Read Error'}
            </span>
          </div>
        )}

        {image.status === 'ready' && image.previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.previewUrl}
            alt={image.name}
            className="w-full h-full object-cover pointer-events-none"
            loading="lazy"
          />
        )}

        {/* Top Floating Selection Checkbox */}
        <div
          className="absolute top-2 left-2 z-10"
          onClick={(e) => {
            e.stopPropagation();
            toggleSelect(image.id, true);
          }}
        >
          <div
            className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
              isSelected
                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                : 'bg-white/90 dark:bg-slate-900/90 border-slate-300 dark:border-slate-700 hover:border-blue-500'
            }`}
          >
            {isSelected && (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>

        {/* Top Right Action Buttons (hover) */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {image.status === 'ready' && (
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                const res = await exportSingleImage(image, false);
                if (res.blob) {
                  triggerFileDownload(res.blob, res.outputName);
                }
              }}
              className="w-6 h-6 rounded-md bg-black/60 hover:bg-blue-600 text-white flex items-center justify-center transition-colors"
              title={`Download ${image.name}`}
              aria-label={`Download photo ${image.name}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeImages([image.id]);
            }}
            className="w-6 h-6 rounded-md bg-black/60 hover:bg-rose-600 text-white flex items-center justify-center transition-colors"
            aria-label={`Remove photo ${image.name}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Dirty / Edited Badge */}
        {image.dirty && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-600 text-white shadow-xs">
            Edited
          </span>
        )}
      </div>

      {/* Info & Badges */}
      <div className="p-2.5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <p
            className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate flex-1"
            title={image.name}
          >
            {image.name}
          </p>
          <span className="text-[10px] text-slate-400 shrink-0">
            {formatBytes(image.size)}
          </span>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {hasCoords ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              GPS
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              No GPS
            </span>
          )}

          {keywordCount > 0 ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {keywordCount} kw
            </span>
          ) : null}

          {hasAltText ? (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
              title={image.edit.altText}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Alt text
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-400 dark:bg-slate-800/80 dark:text-slate-500">
              No alt text
            </span>
          )}
        </div>

        {/* Inline Quick Alt Text Editing */}
        {image.status === 'ready' && (
          <div
            className="mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <label
              htmlFor={`inline-alt-${image.id}`}
              className="sr-only"
            >
              Alt text for {image.name}
            </label>
            <input
              id={`inline-alt-${image.id}`}
              type="text"
              dir="auto"
              maxLength={1000}
              value={image.stripText ? '' : (image.edit.altText || '')}
              onChange={(e) => {
                applyText([image.id], { altText: e.target.value }, 'overwrite');
              }}
              placeholder="Add alt text..."
              className="flex-1 min-w-0 text-[11px] px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors"
            />
            <button
              type="button"
              disabled={!hasAltText}
              onClick={async (e) => {
                e.stopPropagation();
                const textToCopy = image.stripText ? '' : image.edit.altText?.trim();
                if (!textToCopy) return;
                try {
                  await navigator.clipboard.writeText(textToCopy);
                  addToast({
                    type: 'success',
                    text: `Copied alt text for "${image.name}" to clipboard.`,
                  });
                } catch {
                  addToast({
                    type: 'error',
                    text: 'Failed to copy alt text to clipboard.',
                  });
                }
              }}
              className="shrink-0 p-1 rounded-md text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title={hasAltText ? 'Copy alt text to clipboard' : 'No alt text to copy'}
              aria-label={`Copy alt text for ${image.name}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
