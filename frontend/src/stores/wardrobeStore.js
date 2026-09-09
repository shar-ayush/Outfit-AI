import { create } from 'zustand';
import { getCachedWardrobe, setCachedWardrobe } from '@/utils/storage';

const DEFAULT_FILTERS = {
  category: null,
  formality: null,
  occasion: null,
  season: null,
  search: '',
};

export const useWardrobeStore = create((set, get) => ({
  items: [],
  isOffline: false,
  filters: { ...DEFAULT_FILTERS },
  sort: 'createdAt',

  setItems: (items) => {
    set({ items, isOffline: false });
    setCachedWardrobe(items);
  },

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

  loadOfflineCache: async () => {
    const cached = await getCachedWardrobe();
    if (cached) {
      set({ items: cached, isOffline: true });
    }
    return cached;
  },
}));

export default useWardrobeStore;