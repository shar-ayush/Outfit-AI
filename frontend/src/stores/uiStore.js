import { create } from 'zustand';
import { setStoredTheme } from '@/utils/storage';

export const useUIStore = create((set, get) => ({
  theme: 'system',
  toast: {
    visible: false,
    message: '',
    type: 'info',
  },

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

export const uiStore = {
  getState: useUIStore.getState,
  showToast: (message, type) => useUIStore.getState().showToast(message, type),
};

export default useUIStore;
