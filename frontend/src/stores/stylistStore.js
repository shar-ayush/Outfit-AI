import { create } from 'zustand';

export const useStylistStore = create((set, get) => ({
  activeSessionId: null,
  messages: [],
  isTyping: false,
  pendingOutfits: false,

  setSession: (sessionId) => set({ activeSessionId: sessionId }),

  loadMessages: (messages) => set({ messages }),

  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  setTyping: (isTyping) => set({ isTyping }),

  setPendingOutfits: (pendingOutfits) => set({ pendingOutfits }),

  clearSession: () => {
    set({ activeSessionId: null, messages: [], isTyping: false, pendingOutfits: false });
  },
}));

export default useStylistStore;
