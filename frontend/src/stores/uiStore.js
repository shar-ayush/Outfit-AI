// src/stores/uiStore.js
//
// Global UI state — theme preference and the single active toast.
// Deliberately has ZERO dependency on api/client.js or any other store,
// so it's safe for client.js to import this for offline-error toasts
// without creating a circular import.

import { create } from 'zustand';
import { setStoredTheme } from '@/utils/storage';

export const useUIStore = create((set, get) => ({
  // ── State ────────────────────────────────────────────────
  theme: 'system', // 'light' | 'dark' | 'system'
  toast: {
    visible: false,
    message: '',
    type: 'info', // 'success' | 'error' | 'info' | 'offline'
  },

  // ── Actions ──────────────────────────────────────────────
  showToast: (message, type = 'info') => {
    set({ toast: { visible: true, message, type } });
  },

  hideToast: () => {
    set((state) => ({ toast: { ...state.toast, visible: false } }));
  },

  setTheme: (theme) => {
    set({ theme });
    setStoredTheme(theme);
  },
}));

// Non-hook accessor — used by api/client.js interceptors, which run
// outside React component render and can't call the hook directly.
export const uiStore = {
  getState: useUIStore.getState,
  showToast: (message, type) => useUIStore.getState().showToast(message, type),
};

export default useUIStore;
