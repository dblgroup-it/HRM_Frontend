import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { queryClient } from '@shared/api';
import { ErrorBoundary } from '@shared/components/feedback';

import { RealtimeProvider } from './RealtimeProvider';

/** Aggregates every global provider in one place. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RealtimeProvider>{children}</RealtimeProvider>
        </BrowserRouter>
        <Toaster position="top-right" closeButton richColors />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
