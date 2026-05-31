import { QueryClient } from '@tanstack/react-query'

/** Cliente global de TanStack Query con defaults razonables. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s antes de considerar los datos "viejos"
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
