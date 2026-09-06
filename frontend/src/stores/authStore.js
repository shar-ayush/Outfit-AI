// src/stores/authStore.js
//
// Owns: current user, in-memory access token, auth status.
//
// The access token itself is NOT stored in this Zustand state — it's set
// directly on api/client.js via setAccessToken() so the axios interceptor
// can read it synchronously without subscribing to the store.
//
// registerAuthFailureHandler wiring (see api/client.js): when a refresh
// token turns out to be invalid/expired, client.js calls this handler,
// which resets auth state here — without client.js ever importing this
// file directly (avoids the circular import authStore -> api/auth.js ->
// api/client.js -> authStore).

import { create } from 'zustand';
import { authApi } from '@/api';
import { setAccessToken, registerAuthFailureHandler } from '@/api/client';
import { getRefreshToken, setRefreshToken, clearRefreshToken } from '@/utils/storage';

// FIX (gap #10): logout previously only reset auth state — stylistStore's
// chat messages and wardrobeStore's filters/offline cache persisted in
// memory across a logout, so a second account logging in on the same
// device could briefly see the previous user's chat history or filter
// selections until those stores happened to be overwritten. Imported
// directly here (not via the '@/stores' barrel, to avoid a circular
// import back through stores/index.js) and cleared on every logout path.
import { useStylistStore } from './stylistStore';
import { useWardrobeStore } from './wardrobeStore';

function clearOtherStores() {
  useStylistStore.getState().clearSession();
  useWardrobeStore.getState().clearFilters();
  useWardrobeStore.getState().setItems([]);
}

export const useAuthStore = create((set, get) => ({
  // ── State ────────────────────────────────────────────────
  user: null,
  isAuthenticated: false,
  isLoading: true, // true until the initial checkAuth() bootstrap resolves

  // ── Actions ──────────────────────────────────────────────

  // Called once from the root layout / splash screen on app boot.
  // Tries to silently restore a session from the persisted refresh token.
  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const storedRefreshToken = await getRefreshToken();
      if (!storedRefreshToken) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      const { accessToken, refreshToken: rotatedRefreshToken } =
        await authApi.refreshToken(storedRefreshToken);

      setAccessToken(accessToken);
      await setRefreshToken(rotatedRefreshToken);

      const user = await authApi.getMe();

      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      // Refresh token invalid/expired, or /me failed — treat as logged out
      setAccessToken(null);
      await clearRefreshToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  register: async ({ email, password, username, gender }) => {
    const { user, accessToken, refreshToken } = await authApi.register({
      email,
      password,
      username,
      gender,
    });
    setAccessToken(accessToken);
    await setRefreshToken(refreshToken);
    set({ user, isAuthenticated: true });
    return user;
  },

  login: async ({ email, password }) => {
    const { user, accessToken, refreshToken } = await authApi.login({ email, password });
    setAccessToken(accessToken);
    await setRefreshToken(refreshToken);
    set({ user, isAuthenticated: true });
    return user;
  },

  logout: async () => {
    try {
      const refreshTokenValue = await getRefreshToken();
      await authApi.logout(refreshTokenValue);
    } catch {
      // Even if the network call fails, log out locally
    }
    setAccessToken(null);
    await clearRefreshToken();
    clearOtherStores();
    set({ user: null, isAuthenticated: false });
  },

  logoutAllDevices: async () => {
    try {
      await authApi.logoutAll();
    } finally {
      setAccessToken(null);
      await clearRefreshToken();
      clearOtherStores();
      set({ user: null, isAuthenticated: false });
    }
  },

  // Local-only patch — e.g. after onboarding completes or profile edits,
  // without needing a full re-fetch of /me.
  updateUser: (partialUser) => {
    set((state) => ({ user: { ...state.user, ...partialUser } }));
  },
}));

// Wire the auth-failure hook once, at module load — see file header.
registerAuthFailureHandler(() => {
  clearOtherStores();
  useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
});

export default useAuthStore;