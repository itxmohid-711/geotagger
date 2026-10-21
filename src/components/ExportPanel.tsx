'use client';

import React, { useState } from 'react';
import { useApp } from '@/state/AppContext';
import {
  exportSingleImage,
  exportBatchZip,
  exportToDirectory,
  triggerFileDownload,
  ExportProgress,
  ExportBatchResult,
} from '@/lib/metadata/export';

export function ExportPanel() {
  const { state, markExported } = useApp();

  const [keepOriginalName, setKeepOriginalName] = useState(false);
  const [includeUnedited, setIncludeUnedited] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [batchResult, setBatchResult] = useState<ExportBatchResult | null>(null);

  const selectedImages = state.images.filter((img) => state.selectedIds.has(img.id));
  const hasSelection = selectedImages.length > 0;

  // Determine export candidates: by default only edited photos, unless "includeUnedited" checked
  const basePool = hasSelection ? selectedImages : state.images;
  const exportItems = basePool.filter((img) => {
    if (img.status !== 'ready') return false;
    return includeUnedited ? true : img.dirty;
  });

  const totalReady = state.images.filter((img) => img.status === 'ready').length;
  const editedCount = state.images.filter((img) => img.dirty).length;

  const hasChromiumDirPicker =
    typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  // Export single selected file
  const handleDownloadSingle = async () => {
    if (selectedImages.length !== 1) return;
    const item = selectedImages[0];
    setIsExporting(true);
    setBatchResult(null);

    const result = await exportSingleImage(item, keepOriginalName);
    setIsExporting(false);

    if (result.blob) {
      triggerFileDownload(result.blob, result.outputName);
      markExported([item.id]);
      setBatchResult({ successful: [result], failed: [] });
    } else {
      setBatchResult({ successful: [], failed: [result] });
    }
  };

  // Export batch ZIP
  const handleDownloadZip = async () => {
    if (exportItems.length === 0) return;
    setIsExporting(true);
    setBatchResult(null);
    setProgress({ current: 0, total: exportItems.length, currentFileName: '' });

    const result = await exportBatchZip(exportItems, keepOriginalName, (p) => {
      setProgress(p);
    });

    setIsExporting(false);
    setProgress(null);
    setBatchResult(result);

    if (result.successful.length > 0) {
      markExported(result.successful.map((r) => r.id));
    }
  };

  // Export to directory (Chromium)
  const handleSaveToFolder = async () => {
    if (exportItems.length === 0) return;
    setIsExporting(true);
    setBatchResult(null);
    setProgress({ current: 0, total: exportItems.length, currentFileName: '' });

    try {
      const result = await exportToDirectory(exportItems, keepOriginalName, (p) => {
        setProgress(p);
      });
      setBatchResult(result);
      if (result.successful.length > 0) {
        markExported(result.successful.map((r) => r.id));
      }
    } catch (err) {
      // User cancelled picker or error
      if (err instanceof Error && err.name !== 'AbortError') {
        alert(err.message);
      }
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  if (state.images.length === 0) return null;

  return (
    <section
      aria-label="Export metadata and download"
      className="flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4 sm:p-5"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Export &amp; Download
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Exports pixel-identical JPEGs with revised metadata (EXIF + XMP)
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {editedCount}
          </span>
          <span>edited of {totalReady}</span>
        </div>
      </div>

      {/* Settings Options */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-300">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeUnedited}
            onChange={(e) => setIncludeUnedited(e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
          />
          <span>Include unedited photos</span>
        </label>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={keepOriginalName}
            onChange={(e) => setKeepOriginalName(e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
          />
          <span>Keep original file names</span>
        </label>
      </div>

      {/* Progress Bar during Export */}
      {isExporting && progress && (
        <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
          <div className="flex items-center justify-between text-xs font-medium text-blue-800 dark:text-blue-200">
            <span>Processing {progress.currentFileName}...</span>
            <span>
              {progress.current} / {progress.total}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-blue-200 dark:bg-blue-900 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-150"
              style={{
                width: `${Math.round((progress.current / progress.total) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Export Result Summary */}
      {batchResult && (
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              Export Complete:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">
                ✓ {batchResult.successful.length} success
              </span>
              {batchResult.failed.length > 0 && (
                <span className="text-rose-600 dark:text-rose-400">
                  ✗ {batchResult.failed.length} failed
                </span>
              )}
            </div>
          </div>

          {/* Verification check badges per file */}
          <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60 text-[11px]">
            {batchResult.successful.map((item) => (
              <div key={item.id} className="py-1 flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-slate-600 dark:text-slate-300">
                    {item.outputName}
                  </span>
                  {item.verified ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Verified
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Verify Warning
                    </span>
                  )}
                </div>
                {item.warnings && item.warnings.length > 0 && (
                  <div className="mt-0.5 pl-2 text-[10px] text-amber-700 dark:text-amber-300/90 space-y-0.5">
                    {item.warnings.map((w, idx) => (
                      <p key={idx} className="flex items-start gap-1">
                        <span className="shrink-0 font-medium">ℹ Note:</span>
                        <span>{w}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {batchResult.failed.map((item) => (
              <div key={item.id} className="py-1 flex items-center justify-between gap-2 text-rose-600 dark:text-rose-400">
                <span className="truncate">{item.name}</span>
                <span>{item.error || 'Failed'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {selectedImages.length === 1 && (
          <button
            type="button"
            onClick={handleDownloadSingle}
            disabled={isExporting}
            className="flex-1 min-w-[160px] py-2 px-3 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            Download {selectedImages[0].name}
          </button>
        )}

        <button
          type="button"
          onClick={handleDownloadZip}
          disabled={isExporting || exportItems.length === 0}
          className="flex-1 min-w-[160px] py-2 px-3 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
        >
          {isExporting
            ? 'Exporting...'
            : `Download ZIP (${exportItems.length} photo${exportItems.length === 1 ? '' : 's'})`}
        </button>

        {hasChromiumDirPicker && (
          <button
            type="button"
            onClick={handleSaveToFolder}
            disabled={isExporting || exportItems.length === 0}
            className="py-2 px-3 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors border border-slate-200 dark:border-slate-700"
            title="Save files directly to a folder on your computer (Chromium)"
          >
            Save to folder
          </button>
        )}
      </div>
    </section>
  );
}
