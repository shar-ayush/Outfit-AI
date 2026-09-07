// src/hooks/useOutfits.js
//
// Thin TanStack Query wrappers around outfitsApi. Suggestion and action-
// recording are both mutations (not queries) since they're POST calls
// that create server-side records each time — there's nothing to cache
// or dedupe the way a GET would have.

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
    staleTime: 12 * 60 * 60 * 1000, // 12 hours — recommendation stays stable throughout the day
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
      // Saved/worn actions can change saved-outfits list and analytics —
      // invalidate broadly rather than trying to patch caches manually.
      queryClient.invalidateQueries({ queryKey: ['outfits', 'saved'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SLEEPING_ITEMS });
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

// NEW — pairs with backend fix #2. Returns null (not an error) for
// user-created outfits that were never suggested, which is a normal case,
// not a failure — callers should treat `null` as "no recommendation data
// to show" rather than an error state.
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
    mutationFn: outfitsApi.deleteOutfit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfits', 'saved'] });
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