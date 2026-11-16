// src/contexts/ToastContext.jsx — Global toast notification system
// Shows a temporary pill notification at the bottom of the screen.

import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null); // { message, id }

  const showToast = useCallback((message, duration = 2400) => {
    const id = Date.now();
    setToast({ message, id });
    setTimeout(() => {
      setToast(prev => (prev?.id === id ? null : prev));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Global toast pill rendered here so it always overlays everything */}
      {toast && (
        <div
          key={toast.id}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100]
                     px-5 py-3 rounded-full
                     bg-inverse-surface text-inverse-on-surface
                     text-body-sm font-medium shadow-lg
                     animate-[fadeSlideUp_0.3s_ease-out]
                     pointer-events-none whitespace-nowrap"
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
