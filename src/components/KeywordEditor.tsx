'use client';

import React, {
  useState,
  KeyboardEvent,
  ClipboardEvent,
  useMemo,
} from 'react';
import { useApp } from '@/state/AppContext';
import { KeywordMode } from '@/types';
import {
  KeywordPreset,
  loadPresets,
  savePreset,
  deletePreset,
} from '@/lib/metadata/presets';

export function KeywordEditor() {
  const { state, applyKeywords, setStrip } = useApp();

  const selectedImages = useApp().state.images.filter((img) =>
    state.selectedIds.has(img.id)
  );
  const selectedCount = selectedImages.length;

  const [inputVal, setInputVal] = useState('');
  const [mode, setMode] = useState<KeywordMode>('add');
  const [chips, setChips] = useState<string[]>([]);

  // Presets state
  const [presets, setPresets] = useState<KeywordPreset[]>(() => loadPresets());
  const [newPresetName, setNewPresetName] = useState('');
  const [showPresetModal, setShowPresetModal] = useState(false);

  // Compute common keywords across all selected photos
  const commonKeywords = useMemo(() => {
    if (selectedCount === 0) return [];
    if (selectedCount === 1) {
      return selectedImages[0].stripKeywords
        ? []
        : selectedImages[0].edit.keywords;
    }

    const firstKws = selectedImages[0].stripKeywords
      ? []
      : selectedImages[0].edit.keywords;
    return firstKws.filter((kw) =>
      selectedImages.every(
        (img) =>
          !img.stripKeywords &&
          img.edit.keywords.some((k) => k.toLowerCase() === kw.toLowerCase())
      )
    );
  }, [selectedCount, selectedImages]);

  // Session keywords for autocomplete suggestions (across all photos in state)
  const sessionKeywords = useMemo(() => {
    const set = new Set<string>();
    for (const img of state.images) {
      if (!img.stripKeywords) {
        for (const k of img.edit.keywords) {
          set.add(k);
        }
      }
    }
    return Array.from(set);
  }, [state.images]);

  // Autocomplete matching list
  const suggestions = useMemo(() => {
    const trimmed = inputVal.trim().toLowerCase();
    if (!trimmed) return [];
    return sessionKeywords
      .filter(
        (k) =>
          k.toLowerCase().includes(trimmed) &&
          !chips.some((c) => c.toLowerCase() === k.toLowerCase())
      )
      .slice(0, 5);
  }, [inputVal, sessionKeywords, chips]);

  // Add keywords to chips array with normalization (max 64 chars, trimmed, unique)
  const addKeywordsToChips = (words: string[]) => {
    const existing = new Set(chips.map((c) => c.toLowerCase()));
    const newChips = [...chips];

    for (const w of words) {
      const trimmed = w.trim();
      if (!trimmed) continue;
      const truncated = trimmed.length > 64 ? trimmed.slice(0, 64) : trimmed;
      const lower = truncated.toLowerCase();
      if (!existing.has(lower)) {
        existing.add(lower);
        newChips.push(truncated);
      }
    }
    setChips(newChips);
    setInputVal('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputVal.trim()) {
        addKeywordsToChips([inputVal]);
      }
    } else if (e.key === 'Backspace' && !inputVal && chips.length > 0) {
      e.preventDefault();
      setChips(chips.slice(0, -1));
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    // Split on commas, semicolons, and newlines
    const parts = pasted.split(/[,;\r\n]+/);
    addKeywordsToChips(parts);
  };

  const removeChip = (indexToRemove: number) => {
    setChips(chips.filter((_, idx) => idx !== indexToRemove));
  };

  // Remove a common keyword directly from all selected photos
  const handleRemoveCommonKeyword = (kwToRemove: string) => {
    for (const img of selectedImages) {
      const remaining = img.edit.keywords.filter(
        (k) => k.toLowerCase() !== kwToRemove.toLowerCase()
      );
      applyKeywords([img.id], remaining, 'replace');
    }
  };

  // Apply chip keywords
  const handleApply = () => {
    if (chips.length === 0 || selectedCount === 0) return;
    const selectedIds = Array.from(state.selectedIds);
    applyKeywords(selectedIds, chips, mode);
    setChips([]);
  };

  // Strip keywords from selected
  const handleStripKeywords = () => {
    const selectedIds = Array.from(state.selectedIds);
    setStrip(selectedIds, { keywords: true });
    setChips([]);
  };

  // Preset operations
  const handleSavePreset = () => {
    if (!newPresetName.trim() || chips.length === 0) return;
    const updated = savePreset(newPresetName, chips);
    setPresets(updated);
    setNewPresetName('');
    setShowPresetModal(false);
  };

  const handleApplyPreset = (preset: KeywordPreset) => {
    addKeywordsToChips(preset.keywords);
  };

  const handleDeletePreset = (id: string) => {
    const updated = deletePreset(id);
    setPresets(updated);
  };

  return (
    <section
      aria-label="Keyword tags editor"
      className="flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4 sm:p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Photo Keywords
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Write keywords to IPTC, EXIF XPKeywords, and XMP dc:subject
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setMode('add')}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
              mode === 'add'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Add to existing
          </button>
          <button
            type="button"
            onClick={() => setMode('replace')}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
              mode === 'replace'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Replace all
          </button>
        </div>
      </div>

      {/* Common keywords in selected photos */}
      {selectedCount > 0 && commonKeywords.length > 0 && (
        <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            {selectedCount === 1
              ? 'Current Keywords:'
              : 'Keywords Common to All Selected:'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {commonKeywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 group"
              >
                <span>{kw}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCommonKeyword(kw)}
                  className="text-slate-400 hover:text-rose-600 transition-colors ml-0.5"
                  title="Remove from all selected photos"
                  aria-label={`Remove keyword ${kw} from selected`}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Chip Input Box */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Add New Keywords (press Enter or comma):
        </label>
        <div className="min-h-16 flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-blue-500">
          {chips.map((chip, idx) => (
            <span
              key={`${chip}-${idx}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
            >
              <span>{chip}</span>
              <button
                type="button"
                onClick={() => removeChip(idx)}
                className="text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 ml-0.5"
                aria-label={`Remove chip ${chip}`}
              >
                &times;
              </button>
            </span>
          ))}

          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={chips.length === 0 ? 'e.g. Travel, Mountain, 2026...' : ''}
            className="flex-1 min-w-[120px] bg-transparent text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden"
          />
        </div>

        {/* Counter & Autocomplete Suggestions */}
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>{chips.length} keyword{chips.length === 1 ? '' : 's'} prepared</span>
          {inputVal.length > 0 && (
            <span>{inputVal.length}/64 max chars</span>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400">Suggestions:</span>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addKeywordsToChips([s])}
                className="px-2 py-0.5 text-[11px] rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/50 text-slate-600 dark:text-slate-300 transition-colors"
              >
                + {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preset Sets */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500">Presets:</span>
          {presets.length === 0 ? (
            <span className="text-[11px] text-slate-400 italic">No saved presets</span>
          ) : (
            presets.map((p) => (
              <div
                key={p.id}
                className="inline-flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden text-[11px]"
              >
                <button
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2 py-0.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  title={p.keywords.join(', ')}
                >
                  {p.name} ({p.keywords.length})
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePreset(p.id)}
                  className="px-1 text-slate-400 hover:text-rose-600"
                  aria-label={`Delete preset ${p.name}`}
                >
                  &times;
                </button>
              </div>
            ))
          )}
        </div>

        {chips.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPresetModal(true)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Save as preset
          </button>
        )}
      </div>

      {/* Save Preset Dialog */}
      {showPresetModal && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center gap-2">
          <input
            type="text"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            placeholder="Preset name (e.g. Vacation 2026)..."
            className="flex-1 px-2.5 py-1 text-xs rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={handleSavePreset}
            disabled={!newPresetName.trim()}
            className="px-3 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setShowPresetModal(false)}
            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Apply / Strip Actions */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={handleApply}
          disabled={chips.length === 0 || selectedCount === 0}
          className="w-full py-2 px-4 rounded-lg bg-blue-600 text-white font-medium text-xs hover:bg-blue-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
        >
          {selectedCount === 0
            ? 'Select photos to apply keywords'
            : chips.length === 0
            ? 'Add keyword chips to apply'
            : `Apply ${chips.length} keyword${chips.length === 1 ? '' : 's'} (${mode}) to ${selectedCount} selected photo${selectedCount === 1 ? '' : 's'}`}
        </button>

        {selectedCount > 0 && (
          <button
            type="button"
            onClick={handleStripKeywords}
            className="text-xs text-rose-600 dark:text-rose-400 hover:underline ml-auto"
          >
            Strip keywords from selected
          </button>
        )}
      </div>
    </section>
  );
}
