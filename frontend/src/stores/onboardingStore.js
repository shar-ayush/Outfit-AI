// src/stores/onboardingStore.js
//
// Scratch state for the 4-step onboarding wizard — collects answers across
// separate route files (style-quiz → color-quiz → climate-quiz → complete)
// since Expo Router doesn't pass complex state through navigation params.
//
// Not part of the original store list in the design plan, but necessary
// for the same reason AuthHeader was pulled into common/: it's shared,
// small, and would otherwise duplicate logic. Reset after submission so a
// second onboarding attempt (e.g. after logout/re-register) starts clean.

import { create } from 'zustand';

export const useOnboardingStore = create((set) => ({
  preferredStyles: [],       // string[] — from STYLE_OPTIONS values
  preferredColors: [],       // string[] — from COLOR_OPTIONS values
  climate: null,             // string — from CLIMATE_OPTIONS values
  preferredFormality: [],    // string[] — backend expects an array; UI is single-select

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
