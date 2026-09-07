import { AlertTriangle, RefreshCw } from 'lucide-react';

import { cn } from '@shared/lib';
import { Button } from './Button';

export interface ErrorCardProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

/**
 * Inline failure state for a panel that couldn't load.
 *
 * Deliberately compact and in-flow rather than a full-page takeover — the rest
 * of the screen usually still works, and a retry beside the message is faster
 * than a page reload.
 */
export function ErrorCard({
  title = "Couldn't load this",
  message,
  onRetry,
  retrying = false,
  className,
}: ErrorCardProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50/60 p-4 sm:flex-row sm:items-center',
        className,
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
        <AlertTriangle className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-red-900">{title}</p>
        {message && (
          <p className="mt-0.5 break-words text-xs leading-5 text-red-700/90">
            {message}
          </p>
        )}
      </div>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          isLoading={retrying}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          className="shrink-0 border-red-200 bg-white text-red-700 hover:bg-red-50"
        >
          Retry
        </Button>
      )}
    </div>
  );
}
