// src/hooks/usePlans.js

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plansApi } from '@/api';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { toISODateString } from '@/utils/dateUtils';

export function useWeekPlan(startDate) {
  const key = startDate ? toISODateString(startDate) : 'current';
  return useQuery({
    queryKey: QUERY_KEYS.WEEK_PLAN(key),
    queryFn: () => plansApi.getWeekPlan(startDate ? toISODateString(startDate) : undefined),
  });
}

export function useDayPlan(date) {
  return useQuery({
    queryKey: ['plans', 'day', date],
    queryFn: async () => {
      const result = await plansApi.getPlans({ startDate: date, endDate: date, limit: 1 });
      return result.plans[0] || null;
    },
    enabled: !!date,
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: plansApi.createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}

export function useUpdatePlanStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, ...body }) => plansApi.updatePlanStatus(planId, body),
    onSuccess: () => {
      // A 'worn' status triggers the full learning pipeline server-side —
      // invalidate analytics too so Home/Analytics reflect it immediately.
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SLEEPING_ITEMS });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: plansApi.deletePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}
