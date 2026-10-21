'use client';

import React, { useState } from 'react';
import { AppProvider, useApp } from '@/state/AppContext';
import { DropZone } from '@/components/DropZone';
import { Toolbar } from '@/components/Toolbar';
import { ImageGrid } from '@/components/ImageGrid';
import { EmptyState } from '@/components/EmptyState';
import { EditorWorkspaceResponsive, MobileTab } from '@/components/EditorWorkspaceResponsive';
import { ToastContainer } from '@/components/ToastContainer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FaqSection } from '@/components/FaqSection';

function MainWorkspace() {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState<MobileTab>('photos');

  const selectedCount = state.selectedIds.size;

  return (
    <div className="flex-1 flex flex-col">
      {/* Aria Live Announcement Region for screen readers */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {state.announcement}
      </div>

      {/* Mobile Tab Switcher (<lg screens) */}
      <nav
        aria-label="Mobile workspace navigation"
        className="lg:hidden sticky top-[57px] z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-around gap-1"
      >
        <button
          type="button"
          onClick={() => setActiveTab('photos')}
          className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg text-center transition-all ${
            activeTab === 'photos'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Photos ({state.images.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('location')}
          className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg text-center transition-all ${
            activeTab === 'location'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Location {selectedCount > 0 && `(${selectedCount})`}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('descriptions')}
          className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg text-center transition-all ${
            activeTab === 'descriptions'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Descriptions
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('keywords')}
          className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg text-center transition-all ${
            activeTab === 'keywords'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Keywords
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('export')}
          className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg text-center transition-all ${
            activeTab === 'export'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Export
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Photos Library */}
        <section
          aria-label="Photo library"
          className={`lg:col-span-6 xl:col-span-5 flex-col gap-4 ${
            activeTab === 'photos' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <DropZone />
          <Toolbar />
          {state.images.length === 0 ? <EmptyState /> : <ImageGrid />}
        </section>

        {/* Right Column: Editor Workspace (Location, Keywords, Export) */}
        <section
          aria-label="Editor tools"
          className={`lg:col-span-6 xl:col-span-7 h-full flex-col ${
            activeTab !== 'photos' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <EditorWorkspaceResponsive activeTab={activeTab} />
        </section>
      </main>

      {/* FAQ & How It Works Guide Section */}
      <FaqSection />

      {/* Global Toast Notifications Container */}
      <ToastContainer />
    </div>
  );
}

export default function HomePage() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainWorkspace />
      </AppProvider>
    </ErrorBoundary>
  );
}
