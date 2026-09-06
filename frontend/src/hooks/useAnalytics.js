// src/hooks/useAnalytics.js

import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export function useDashboard() {
  return useQuery({
    queryKey: QUERY_KEYS.DASHBOARD,
    queryFn: analyticsApi.getDashboard,
  });
}

export function useSleepingItems() {
  return useQuery({
    queryKey: QUERY_KEYS.SLEEPING_ITEMS,
    queryFn: analyticsApi.getSleepingItems,
  });
}

export function useCostPerWear() {
  return useQuery({
    queryKey: QUERY_KEYS.COST_PER_WEAR,
    queryFn: analyticsApi.getCostPerWear,
  });
}

export function useWearFrequency(limit = 10) {
  return useQuery({
    queryKey: QUERY_KEYS.WEAR_FREQUENCY(limit),
    queryFn: () => analyticsApi.getWearFrequency(limit),
  });
}

export function useUtilization() {
  return useQuery({
    queryKey: QUERY_KEYS.UTILIZATION,
    queryFn: analyticsApi.getUtilization,
  });
}
