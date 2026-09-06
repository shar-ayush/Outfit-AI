// src/hooks/useWardrobe.js
//
// TanStack Query wrappers over api/wardrobe.js. The list uses
// useInfiniteQuery (per plan: "TanStack Query's useInfiniteQuery for
// wardrobe... Load 20 items per page").

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wardrobeApi } from '@/api';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { useWardrobeStore } from '@/stores';

const PAGE_SIZE = 20;

export function useWardrobeList(filters = {}, sort = 'createdAt') {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.WARDROBE({ ...filters, sort }),
    queryFn: ({ pageParam = 1 }) =>
      wardrobeApi.getWardrobe({ ...filters, sortBy: sort, page: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
  });
}

export function useClothItem(clothId) {
  return useQuery({
    queryKey: QUERY_KEYS.CLOTH_ITEM(clothId),
    queryFn: () => wardrobeApi.getClothById(clothId),
    enabled: !!clothId,
  });
}

export function useUploadCloth() {
  const queryClient = useQueryClient();
  const addItem = useWardrobeStore((s) => s.addItem);

  return useMutation({
    mutationFn: ({ asset, extra }) => wardrobeApi.uploadCloth(asset, extra),
    onSuccess: (cloth) => {
      addItem(cloth); // optimistic local mirror — see wardrobeStore
      queryClient.invalidateQueries({ queryKey: ['wardrobe'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WARDROBE_STATS });
    },
  });
}

export function useUploadBulkClothes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assets) => wardrobeApi.uploadBulkClothes(assets),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wardrobe'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WARDROBE_STATS });
    },
  });
}

export function useUpdateCloth(clothId) {
  const queryClient = useQueryClient();
  const updateItem = useWardrobeStore((s) => s.updateItem);

  return useMutation({
    mutationFn: (updateData) => wardrobeApi.updateCloth(clothId, updateData),
    onSuccess: (cloth) => {
      updateItem(clothId, cloth);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CLOTH_ITEM(clothId) });
      queryClient.invalidateQueries({ queryKey: ['wardrobe'] });
    },
  });
}

export function useToggleAvailability() {
  const queryClient = useQueryClient();
  const updateItem = useWardrobeStore((s) => s.updateItem);

  return useMutation({
    mutationFn: (clothId) => wardrobeApi.toggleAvailability(clothId),
    onSuccess: ({ clothId, isAvailable }) => {
      updateItem(clothId, { isAvailable });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CLOTH_ITEM(clothId) });
      queryClient.invalidateQueries({ queryKey: ['wardrobe'] });
    },
  });
}

export function useArchiveCloth() {
  const queryClient = useQueryClient();
  const removeItem = useWardrobeStore((s) => s.removeItem);

  return useMutation({
    mutationFn: (clothId) => wardrobeApi.archiveCloth(clothId),
    onSuccess: (_data, clothId) => {
      removeItem(clothId);
      queryClient.invalidateQueries({ queryKey: ['wardrobe'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WARDROBE_STATS });
    },
  });
}

export function useWardrobeStats() {
  return useQuery({
    queryKey: QUERY_KEYS.WARDROBE_STATS,
    queryFn: wardrobeApi.getWardrobeStats,
  });
}
