'use client';

import React from 'react';
import { LocationPanel } from './LocationPanel';
import { KeywordEditor } from './KeywordEditor';
import { TextEditor } from './TextEditor';
import { ExportPanel } from './ExportPanel';

export type MobileTab = 'photos' | 'location' | 'descriptions' | 'keywords' | 'export';

interface ResponsiveWorkspaceProps {
  activeTab: MobileTab;
}

export function EditorWorkspaceResponsive({ activeTab }: ResponsiveWorkspaceProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* On desktop (lg+), show all sections; on mobile, render based on activeTab */}
      <div className={`flex flex-col gap-5 ${activeTab !== 'location' ? 'hidden lg:flex' : 'flex'}`}>
        <LocationPanel />
      </div>

      <div className={`flex flex-col gap-5 ${activeTab !== 'descriptions' ? 'hidden lg:flex' : 'flex'}`}>
        <TextEditor />
      </div>

      <div className={`flex flex-col gap-5 ${activeTab !== 'keywords' ? 'hidden lg:flex' : 'flex'}`}>
        <KeywordEditor />
      </div>

      <div className={`flex flex-col gap-5 ${activeTab !== 'export' ? 'hidden lg:flex' : 'flex'}`}>
        <ExportPanel />
      </div>
    </div>
  );
}
