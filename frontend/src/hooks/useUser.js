// src/hooks/useUser.js

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/api';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { useAuthStore } from '@/stores';

export function usePreferences() {
  return useQuery({
    queryKey: QUERY_KEYS.PREFERENCES,
    queryFn: userApi.getPreferences,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);

  return useMutation({
    mutationFn: userApi.updateProfile,
    onSuccess: (user) => {
      updateUser(user);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: userApi.changePassword,
  });
}

export function useDeleteAccount() {
  const logout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: userApi.deleteAccount,
    onSuccess: () => {
      // Account no longer exists server-side — just clear local state
      // directly rather than calling the (now pointless) logout endpoint.
      logout();
    },
  });
}
