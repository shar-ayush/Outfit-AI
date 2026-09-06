// src/stores/wardrobeStore.js
//
// Local wardrobe cache + active filter/sort state.
//
// FIX (gap #9): `items`/`addItem`/`setItems` previously ran in parallel
// with nothing ever reading them — the wardrobe grid rendered from the
// TanStack Query cache exclusively, making this store's item list dead
// state. As of the gap-audit fixes, `items` now serves ONE real purpose:
// it's the AsyncStorage-backed offline-browsing cache (see
// wardrobe/index.jsx, which calls setItems() on every successful online
// fetch and loadOfflineCache() on failure). It is intentionally NOT the
// live render source when online — that stays TanStack Query, which
// already handles pagination/invalidation correctly.
//
// Note the division of responsibility with TanStack Query: TanStack Query
// owns the server-state cache (fetched via useWardrobeList, keyed by
// QUERY_KEYS.WARDROBE(filters)); this store owns UI-only state (which
// filters are currently selected) plus the offline-cache mirror described
// above.

import { create } from 'zustand';
import { getCachedWardrobe, setCachedWardrobe } from '@/utils/storage';

const DEFAULT_FILTERS = {
  category: null,     // 'top' | 'bottom' | 'footwear' | 'outerwear' | 'accessory' | 'full_body'
  formality: null,     // 'casual' | 'semi-formal' | 'formal'
  occasion: null,
  season: null,
  search: '',
};

export const useWardrobeStore = create((set, get) => ({
  // ── State ────────────────────────────────────────────────
  items: [],
  isOffline: false,
  filters: { ...DEFAULT_FILTERS },
  sort: 'createdAt', // 'createdAt' | 'mostWorn' | 'leastWorn' | 'name' | 'price'

  // ── Actions ──────────────────────────────────────────────

  setItems: (items) => {
    set({ items, isOffline: false });
    setCachedWardrobe(items); // keep offline cache fresh
  },

  // Optimistic add — called right after a successful upload response,
  // before the wardrobe query has refetched.
  addItem: (item) => {
    set((state) => ({ items: [item, ...state.items] }));
  },

  removeItem: (clothId) => {
    set((state) => ({
      items: state.items.filter((i) => i._id !== clothId),
    }));
  },

  updateItem: (clothId, patch) => {
    set((state) => ({
      items: state.items.map((i) => (i._id === clothId ? { ...i, ...patch } : i)),
    }));
  },

  setFilters: (patch) => {
    set((state) => ({ filters: { ...state.filters, ...patch } }));
  },

  clearFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS } });
  },

  setSort: (sort) => set({ sort }),

  // Called when a wardrobe fetch fails due to being offline — falls back
  // to whatever was last cached to AsyncStorage.
  loadOfflineCache: async () => {
    const cached = await getCachedWardrobe();
    if (cached) {
      set({ items: cached, isOffline: true });
    }
    return cached;
  },
}));

export default useWardrobeStore;