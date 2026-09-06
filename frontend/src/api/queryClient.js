// src/api/queryClient.js
//
// Single QueryClient instance, provided once at the root layout.
// staleTime of 30s means most screens won't refetch on every focus —
// good default for a personal-data app where the server-driven learning
// pipeline doesn't change data every second anyway.

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false, // not meaningful on native, avoid surprise refetches
    },
    mutations: {
      retry: 0,
    },
  },
});

export default queryClient;
