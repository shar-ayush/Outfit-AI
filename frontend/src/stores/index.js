// src/stores/index.js
//
// Barrel export for Zustand stores:
//   import { useAuthStore, useWardrobeStore } from '@/stores';

export { useAuthStore, default as authStore } from './authStore';
export { useWardrobeStore, default as wardrobeStore } from './wardrobeStore';
export { useStylistStore, default as stylistStore } from './stylistStore';
export { useOnboardingStore, default as onboardingStore } from './onboardingStore';
// uiStore.js exports both the hook (useUIStore) and a non-hook accessor
// object (uiStore) for use outside React (e.g. api/client.js) — re-export
// both as-is, no aliasing, to avoid confusing the two.
export { useUIStore, uiStore } from './uiStore';
