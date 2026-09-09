import { create } from 'zustand';
import { authApi } from '@/api';
import { setAccessToken, registerAuthFailureHandler } from '@/api/client';
import { getRefreshToken, setRefreshToken, clearRefreshToken } from '@/utils/storage';

import { useStylistStore } from './stylistStore';
import { useWardrobeStore } from './wardrobeStore';
import { queryClient } from '@/api/queryClient';

function clearOtherStores() {
  useStylistStore.getState().clearSession();
  useWardrobeStore.getState().clearFilters();
  useWardrobeStore.getState().setItems([]);
  queryClient.clear();
}

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

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
      setAccessToken(null);
      await clearRefreshToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  register: async ({ email, password, username, gender }) => {
    clearOtherStores();
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
    clearOtherStores();
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

  updateUser: (partialUser) => {
    set((state) => ({ user: { ...state.user, ...partialUser } }));
  },
}));

registerAuthFailureHandler(() => {
  clearOtherStores();
  useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
});

export default useAuthStore;