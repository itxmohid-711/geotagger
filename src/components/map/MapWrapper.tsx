'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { MapViewProps } from './MapView';

export function MapSkeleton() {
  return (
    <div
      aria-label="Loading map"
      className="w-full h-full min-h-[300px] rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse flex flex-col items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-800"
    >
      <svg
        className="w-8 h-8 animate-spin text-blue-500 mb-2"
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
      <span className="text-xs font-medium">Loading OpenStreetMap...</span>
    </div>
  );
}

const DynamicMapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export function MapWrapper(props: MapViewProps) {
  return <DynamicMapView {...props} />;
}
