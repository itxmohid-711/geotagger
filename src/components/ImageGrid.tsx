'use client';

import React from 'react';
import { useApp } from '@/state/AppContext';
import { ImageCard } from './ImageCard';

export function ImageGrid() {
  const { state } = useApp();

  if (state.images.length === 0) return null;

  return (
    <div
      role="grid"
      aria-label="Uploaded images grid"
      className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto max-h-[calc(100vh-320px)] p-1"
    >
      {state.images.map((image) => {
        const isSelected = state.selectedIds.has(image.id);
        return <ImageCard key={image.id} image={image} isSelected={isSelected} />;
      })}
    </div>
  );
}
