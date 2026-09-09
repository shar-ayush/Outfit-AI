import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wearLogsApi } from '@/api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export function useWearHistory(page = 1, limit = 20) {
  return useQuery({
    queryKey: QUERY_KEYS.WEAR_HISTORY(page),
    queryFn: () => wearLogsApi.getWearHistory({ page, limit }),
  });
}

export function useItemWearHistory(clothId, limit = 5) {
  return useQuery({
    queryKey: ['wear-logs', 'item', clothId],
    queryFn: () => wearLogsApi.getWearHistory({ clothId, limit }),
    enabled: !!clothId,
  });
}

export function useDeleteAllWearLogs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: wearLogsApi.deleteAllWearLogs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wear-logs'] });
    },
  });
}

export function useLogWear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: wearLogsApi.logWear,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wear-logs'] });
      queryClient.invalidateQueries({ queryKey: ['wardrobe'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SLEEPING_ITEMS });
    },
  });
}