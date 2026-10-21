'use client';

import React from 'react';
import { useApp } from '@/state/AppContext';

export function ToastContainer() {
  const { state, removeToast } = useApp();

  if (state.toasts.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {state.toasts.map((toast) => {
        let bg = 'bg-slate-900 text-white';
        if (toast.type === 'success') bg = 'bg-emerald-600 text-white';
        if (toast.type === 'error') bg = 'bg-rose-600 text-white';
        if (toast.type === 'warning') bg = 'bg-amber-600 text-white';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3 rounded-xl shadow-lg text-xs font-medium ${bg} transition-all duration-200 animate-in fade-in slide-in-from-bottom-2`}
            role="status"
          >
            <span>{toast.text}</span>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-white/80 hover:text-white shrink-0 font-bold ml-1"
              aria-label="Dismiss notification"
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
}
