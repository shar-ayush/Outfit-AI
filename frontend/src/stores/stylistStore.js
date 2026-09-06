// src/stores/stylistStore.js
//
// Active chat session state for the Stylist screen. This is UI-session
// state (what's on screen right now) — the source of truth for a
// session's persisted history lives on the backend's ConversationSession
// and is fetched via useStylist()/TanStack Query when resuming an old
// session from the Sessions list.
//
// messages shape mirrors what the backend stores/returns:
//   { role: 'user'|'assistant', content: string, outfitIds?: string[], outfits?: object[] }
// `outfits` (full outfit objects, not just ids) gets attached client-side
// right after a successful suggestOutfits/sendChatMessage call so
// ChatOutfitCard has everything it needs without an extra fetch.

import { create } from 'zustand';

export const useStylistStore = create((set, get) => ({
  // ── State ────────────────────────────────────────────────
  activeSessionId: null,
  messages: [],
  isTyping: false,
  pendingOutfits: false, // true while outfits are being generated (distinct from isTyping's text-answer case)

  // ── Actions ──────────────────────────────────────────────

  setSession: (sessionId) => set({ activeSessionId: sessionId }),

  // Replace the whole message list — used when resuming a past session
  // (loaded via GET /stylist/sessions/:sessionId).
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
