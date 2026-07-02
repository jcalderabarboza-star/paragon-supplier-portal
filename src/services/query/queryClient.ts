// ────────────────────────────────────────────────────────────────────────────
// The single QueryClient for the app. Mounted at the root in main.tsx (and
// mirrored in test-utils). Pages never touch this directly — they go through
// the wrapper hooks in ./hooks, which go through ./useServiceQuery.
//
// Under test (import.meta.env.MODE === 'test') retries are disabled so an
// injected failure surfaces immediately and deterministically instead of
// being masked by TanStack's default retry/backoff.
// ────────────────────────────────────────────────────────────────────────────

import { QueryClient } from '@tanstack/react-query';

const isTest = import.meta.env.MODE === 'test';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: isTest ? false : 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
