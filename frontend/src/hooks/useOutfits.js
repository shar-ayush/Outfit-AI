import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { outfitsApi } from '@/api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export function useSuggestOutfits() {
  return useMutation({
    mutationFn: outfitsApi.suggestOutfits,
  });
}

export function useDailyOutfit(date, weatherContext = null, options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.DAILY_OUTFIT(date),
    queryFn: () => outfitsApi.getDailyOutfit({ date, weatherContext }),
    staleTime: 12 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    enabled: !!date && (options.enabled !== undefined ? options.enabled : true),
    ...options,
  });
}

export function useRefreshDailyOutfit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ date, weatherContext }) =>
      outfitsApi.refreshDailyOutfit({ date, weatherContext }),
    onSuccess: (data, variables) => {
      if (variables?.date) {
        queryClient.setQueryData(QUERY_KEYS.DAILY_OUTFIT(variables.date), data);
      }
    },
  });
}

export function useOutfitAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ outfitId, ...body }) => outfitsApi.recordOutfitAction(outfitId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfits', 'saved'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SLEEPING_ITEMS });
      queryClient.invalidateQueries({ queryKey: ['outfits', 'daily'] });
    },
  });
}

export function useSavedOutfits(page = 1) {
  return useQuery({
    queryKey: QUERY_KEYS.SAVED_OUTFITS(page),
    queryFn: () => outfitsApi.getSavedOutfits({ page }),
  });
}

export function useOutfit(outfitId) {
  return useQuery({
    queryKey: QUERY_KEYS.OUTFIT(outfitId),
    queryFn: () => outfitsApi.getOutfitById(outfitId),
    enabled: !!outfitId,
  });
}

export function useOutfitRecommendation(outfitId) {
  return useQuery({
    queryKey: ['outfits', outfitId, 'recommendation'],
    queryFn: () => outfitsApi.getRecommendationForOutfit(outfitId),
    enabled: !!outfitId,
  });
}

export function useDeleteOutfit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args) => {
      const outfitId = typeof args === 'string' ? args : args.outfitId;
      const options = typeof args === 'object' ? args : {};
      return outfitsApi.deleteOutfit(outfitId, options);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfits', 'saved'] });
      queryClient.invalidateQueries({ queryKey: ['outfits', 'daily'] });
    },
  });
}

export function useCreateOutfit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: outfitsApi.createOutfit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfits', 'saved'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}