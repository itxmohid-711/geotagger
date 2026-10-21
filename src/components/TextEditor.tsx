'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/state/AppContext';
import { ImageItem, TextMode } from '@/types';

interface TextEditorFormProps {
  selectedImages: ImageItem[];
  selectedCount: number;
}

function TextEditorForm({ selectedImages, selectedCount }: TextEditorFormProps) {
  const { applyText, addToast } = useApp();

  // Compute initial values based on selected images
  const initialData = useMemo(() => {
    if (selectedCount === 0) {
      return {
        alt: '',
        caption: '',
        ext: '',
        altMulti: false,
        captionMulti: false,
        extMulti: false,
      };
    }

    if (selectedCount === 1) {
      const item = selectedImages[0];
      return {
        alt: item.stripText ? '' : item.edit.altText || '',
        caption: item.stripText ? '' : item.edit.caption || '',
        ext: item.stripText ? '' : item.edit.extDescription || '',
        altMulti: false,
        captionMulti: false,
        extMulti: false,
      };
    }

    // Multi-select check for differing values
    const firstAlt = selectedImages[0].stripText ? '' : selectedImages[0].edit.altText || '';
    const diffAlt = selectedImages.some(
      (img) => (img.stripText ? '' : img.edit.altText || '') !== firstAlt
    );

    const firstCaption = selectedImages[0].stripText ? '' : selectedImages[0].edit.caption || '';
    const diffCaption = selectedImages.some(
      (img) => (img.stripText ? '' : img.edit.caption || '') !== firstCaption
    );

    const firstExt = selectedImages[0].stripText ? '' : selectedImages[0].edit.extDescription || '';
    const diffExt = selectedImages.some(
      (img) => (img.stripText ? '' : img.edit.extDescription || '') !== firstExt
    );

    return {
      alt: diffAlt ? '' : firstAlt,
      caption: diffCaption ? '' : firstCaption,
      ext: diffExt ? '' : firstExt,
      altMulti: diffAlt,
      captionMulti: diffCaption,
      extMulti: diffExt,
    };
  }, [selectedImages, selectedCount]);

  // Field values initialized directly from initialData
  const [altText, setAltText] = useState(initialData.alt);
  const [caption, setCaption] = useState(initialData.caption);
  const [extDescription, setExtDescription] = useState(initialData.ext);
  const [altHasMultiple, setAltHasMultiple] = useState(initialData.altMulti);
  const [captionHasMultiple, setCaptionHasMultiple] = useState(initialData.captionMulti);
  const [extDescHasMultiple, setExtDescHasMultiple] = useState(initialData.extMulti);

  const [useAltAsCaption, setUseAltAsCaption] = useState(false);
  const [mode, setMode] = useState<TextMode>('fill-empty');
  const [isExtendedOpen, setIsExtendedOpen] = useState(false);

  // Handle Apply
  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCount === 0) return;

    const trimmedAlt = altText.trim();
    const effectiveCaption = useAltAsCaption ? altText : caption;
    const trimmedCaption = effectiveCaption.trim();
    const trimmedExt = extDescription.trim();

    // Typing nothing and applying does nothing
    if (!trimmedAlt && !trimmedCaption && !trimmedExt && !useAltAsCaption) {
      addToast({
        type: 'info',
        text: 'No text entered. Enter alt text or a caption to apply.',
      });
      return;
    }

    applyText(
      selectedImages.map((i) => i.id),
      {
        altText: trimmedAlt || undefined,
        caption: trimmedCaption || undefined,
        extDescription: trimmedExt || undefined,
      },
      mode
    );

    addToast({
      type: 'success',
      text: `Applied descriptions to ${selectedCount} photo${selectedCount === 1 ? '' : 's'}.`,
    });
  };

  // Separate action to clear alt text
  const handleClearAltText = () => {
    if (selectedCount === 0) return;
    applyText(
      selectedImages.map((i) => i.id),
      { altText: '' },
      'overwrite'
    );
    setAltText('');
    setAltHasMultiple(false);
    addToast({
      type: 'info',
      text: `Cleared alt text on ${selectedCount} photo${selectedCount === 1 ? '' : 's'}.`,
    });
  };

  const hasAnyAltText = selectedImages.some(
    (img) => !img.stripText && !!img.edit.altText?.trim()
  );

  return (
    <form onSubmit={handleApply} className="flex flex-col gap-4">
      {/* Field 1: Alt Text (Primary) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="editor-alt-text"
            className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
          >
            <span>Alt text (accessibility)</span>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
              Primary
            </span>
          </label>

          {/* Character counter & Soft Warning */}
          <div className="flex items-center gap-1.5 text-[11px]">
            {altText.length > 125 && (
              <span
                className="text-amber-600 dark:text-amber-400 font-medium"
                title="Screen readers prefer concise descriptions under 125 characters"
              >
                ⚠️ &gt;125 chars
              </span>
            )}
            <span
              className={
                altText.length > 125
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-400'
              }
            >
              {altText.length} / 1,000
            </span>
          </div>
        </div>

        <textarea
          id="editor-alt-text"
          dir="auto"
          rows={2}
          maxLength={1000}
          value={altText}
          onChange={(e) => {
            setAltText(e.target.value);
            setAltHasMultiple(false);
          }}
          placeholder={
            altHasMultiple
              ? 'Multiple values (type to overwrite or fill)'
              : 'Describe the photo for someone who cannot see it...'
          }
          className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all resize-y"
        />

        {/* Alt Text Guidance */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Describe what&apos;s in the image for someone who can&apos;t see it. Keep it under ~125
          characters when possible. Don&apos;t start with &apos;image of&apos;.
        </p>
      </div>

      {/* Checkbox: Also use alt text as caption */}
      <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={useAltAsCaption}
          onChange={(e) => setUseAltAsCaption(e.target.checked)}
          className="rounded border-slate-300 dark:border-slate-700 text-purple-600 focus:ring-purple-500"
        />
        <span>Also use alt text as the caption</span>
      </label>

      {/* Field 2: Caption / description (Optional) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="editor-caption"
            className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
          >
            <span>Caption / description</span>
            <span className="text-[10px] text-slate-400 font-normal">Optional</span>
          </label>
          <span className="text-[11px] text-slate-400">
            {(useAltAsCaption ? altText : caption).length} / 1,000
          </span>
        </div>

        <textarea
          id="editor-caption"
          dir="auto"
          rows={2}
          maxLength={1000}
          disabled={useAltAsCaption}
          value={useAltAsCaption ? altText : caption}
          onChange={(e) => {
            setCaption(e.target.value);
            setCaptionHasMultiple(false);
          }}
          placeholder={
            useAltAsCaption
              ? 'Mirrors alt text above'
              : captionHasMultiple
              ? 'Multiple values (type to overwrite or fill)'
              : 'Editorial caption or description...'
          }
          className={`w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all resize-y ${
            useAltAsCaption ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''
          }`}
        />
      </div>

      {/* Field 3: Extended description (Collapsible, optional) */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setIsExtendedOpen(!isExtendedOpen)}
          className="w-full px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors"
          aria-expanded={isExtendedOpen}
        >
          <span className="flex items-center gap-1.5">
            <span>Extended description</span>
            <span className="text-[10px] text-slate-400 font-normal">
              (optional, for deep detail)
            </span>
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isExtendedOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExtendedOpen && (
          <div className="p-3 flex flex-col gap-1.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Detailed visual or historical breakdown (max 5,000 chars)</span>
              <span>{extDescription.length} / 5,000</span>
            </div>
            <textarea
              id="editor-ext-description"
              dir="auto"
              rows={3}
              maxLength={5000}
              value={extDescription}
              onChange={(e) => {
                setExtDescription(e.target.value);
                setExtDescHasMultiple(false);
              }}
              placeholder={
                extDescHasMultiple
                  ? 'Multiple values (type to overwrite or fill)'
                  : 'Extended description for complex diagrams, architectural features, or detailed scenes...'
              }
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all resize-y"
            />
          </div>
        )}
      </div>

      {/* Apply Mode: Fill empty vs Overwrite */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Apply mode:
        </span>
        <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setMode('fill-empty')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              mode === 'fill-empty'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Fill only empty
          </button>
          <button
            type="button"
            onClick={() => setMode('overwrite')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              mode === 'overwrite'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Overwrite
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="submit"
          className="flex-1 min-w-[140px] py-2 px-3 text-xs font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-xs"
        >
          Apply to {selectedCount} selected photo{selectedCount === 1 ? '' : 's'}
        </button>

        {hasAnyAltText && (
          <button
            type="button"
            onClick={handleClearAltText}
            className="py-2 px-3 text-xs font-medium rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors"
            title="Remove alt text from selected photos"
          >
            Clear alt text
          </button>
        )}
      </div>
    </form>
  );
}

export function TextEditor() {
  const { state } = useApp();

  const selectedImages = useMemo(
    () => state.images.filter((img) => state.selectedIds.has(img.id)),
    [state.images, state.selectedIds]
  );
  const selectedCount = selectedImages.length;

  const selectionKey = useMemo(
    () => selectedImages.map((i) => i.id).sort().join(','),
    [selectedImages]
  );

  return (
    <section
      aria-label="Photo descriptions and alt text editor"
      className="flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4 sm:p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>Descriptions &amp; Alt Text</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Accessibility
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Embeds XMP accessibility alt text and descriptions without re-encoding pixels
          </p>
        </div>

        {selectedCount > 0 ? (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
            {selectedCount} selected
          </span>
        ) : (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            No photos selected
          </span>
        )}
      </div>

      {selectedCount === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
          Select one or more photos from the grid to edit their alt text and descriptions.
        </div>
      ) : (
        <TextEditorForm
          key={selectionKey}
          selectedImages={selectedImages}
          selectedCount={selectedCount}
        />
      )}
    </section>
  );
}
