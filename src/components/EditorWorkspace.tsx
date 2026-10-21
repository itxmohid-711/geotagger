import React from 'react';
import { LocationPanel } from './LocationPanel';
import { KeywordEditor } from './KeywordEditor';
import { ExportPanel } from './ExportPanel';

export function EditorWorkspace() {
  return (
    <div className="flex flex-col gap-5">
      {/* Location Map & Inputs Panel */}
      <LocationPanel />

      {/* Keywords Chip Editor Panel */}
      <KeywordEditor />

      {/* Export & Download Panel */}
      <ExportPanel />
    </div>
  );
}
