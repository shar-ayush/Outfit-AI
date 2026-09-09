import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tryOnApi } from '@/api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export function useTryOnHistory(page = 1, limit = 20) {
  return useQuery({
    queryKey: QUERY_KEYS.TRY_ON_HISTORY(page),
    queryFn: () => tryOnApi.fetchTryOnHistory(page, limit),
  });
}

export function usePerformTryOn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => tryOnApi.performTryOn(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['try-on', 'history'] });
    },
  });
}

export function useDeleteTryOn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => tryOnApi.deleteTryOnItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['try-on', 'history'] });
    },
  });
}
