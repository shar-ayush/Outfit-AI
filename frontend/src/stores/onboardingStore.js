import { create } from 'zustand';

export const useOnboardingStore = create((set) => ({
  preferredStyles: [],
  preferredColors: [],
  climate: null,
  preferredFormality: [],

  toggleStyle: (value) => set((state) => ({
    preferredStyles: state.preferredStyles.includes(value)
      ? state.preferredStyles.filter((v) => v !== value)
      : [...state.preferredStyles, value],
  })),

  toggleColor: (value) => set((state) => ({
    preferredColors: state.preferredColors.includes(value)
      ? state.preferredColors.filter((v) => v !== value)
      : [...state.preferredColors, value],
  })),

  setClimate: (climate) => set({ climate }),

  setFormality: (value) => set({ preferredFormality: [value] }),

  reset: () => set({
    preferredStyles: [],
    preferredColors: [],
    climate: null,
    preferredFormality: [],
  }),
}));

export default useOnboardingStore;
