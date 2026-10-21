'use client';

import React, { useState } from 'react';
import { useApp } from '@/state/AppContext';

type PrivacyTargetType = 'gps' | 'keywords' | 'text' | 'all';

export function PrivacyModal() {
  const { state, setStrip, addToast } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [targetType, setTargetType] = useState<PrivacyTargetType>('gps');

  const selectedImages = state.images.filter((img) => state.selectedIds.has(img.id));
  const selectedCount = selectedImages.length;

  const openConfirmation = (type: PrivacyTargetType) => {
    setTargetType(type);
    setIsOpen(true);
  };

  const getTargetLabel = (type: PrivacyTargetType): string => {
    switch (type) {
      case 'gps':
        return 'GPS coordinates';
      case 'keywords':
        return 'keywords';
      case 'text':
        return 'alt text and captions';
      case 'all':
        return 'all GPS coordinates, keywords, and text descriptions';
    }
  };

  const handleConfirm = () => {
    const selectedIds = Array.from(state.selectedIds);
    if (targetType === 'gps' || targetType === 'all') {
      setStrip(selectedIds, { gps: true });
    }
    if (targetType === 'keywords' || targetType === 'all') {
      setStrip(selectedIds, { keywords: true });
    }
    if (targetType === 'text' || targetType === 'all') {
      setStrip(selectedIds, { text: true });
    }

    addToast({
      type: 'info',
      text: `Removed ${getTargetLabel(targetType)} from ${selectedCount} photo${selectedCount === 1 ? '' : 's'}.`,
    });
    setIsOpen(false);
  };

  if (selectedCount === 0) return null;

  return (
    <>
      {/* Privacy Toolbar Strip Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
        <span className="text-[11px] font-semibold text-slate-400">Privacy Tools:</span>
        <button
          type="button"
          onClick={() => openConfirmation('gps')}
          className="px-2 py-0.5 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          title="Remove coordinates from selected photos"
        >
          Strip GPS
        </button>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <button
          type="button"
          onClick={() => openConfirmation('keywords')}
          className="px-2 py-0.5 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          title="Remove keywords from selected photos"
        >
          Strip Keywords
        </button>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <button
          type="button"
          onClick={() => openConfirmation('text')}
          className="px-2 py-0.5 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          title="Remove alt text and captions from selected photos"
        >
          Remove alt text/captions
        </button>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <button
          type="button"
          onClick={() => openConfirmation('all')}
          className="px-2 py-0.5 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold transition-colors"
          title="Remove all GPS coordinates, keywords, and descriptions"
        >
          Strip All
        </button>
      </div>

      {/* Confirmation Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
        >
          <div className="max-w-md w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 id="privacy-modal-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Confirm Privacy Metadata Removal
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {targetType === 'gps' &&
                    'GPS coordinates embedded in photos can reveal exact sensitive locations, including your home address, workplace, or private venues when shared online.'}
                  {targetType === 'keywords' &&
                    'Keywords embedded in images may contain sensitive personal tags, project labels, or indexing terms.'}
                  {targetType === 'text' &&
                    'This will remove embedded accessibility alt text (Iptc4xmpCore:AltTextAccessibility), captions (dc:description / EXIF ImageDescription), and extended descriptions.'}
                  {targetType === 'all' &&
                    'This will completely strip all location coordinates, keywords, accessibility alt text, and captions from the selected files.'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
              Are you sure you want to remove{' '}
              <strong className="text-rose-600 dark:text-rose-400">
                {getTargetLabel(targetType)}
              </strong>{' '}
              from the <strong>{selectedCount}</strong> selected photo{selectedCount === 1 ? '' : 's'}?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 active:scale-95 shadow-xs transition-all"
              >
                Yes, Strip Metadata
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
