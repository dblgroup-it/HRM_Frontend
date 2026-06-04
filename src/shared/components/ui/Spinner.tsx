import { Loader2 } from 'lucide-react';

import { cn } from '@shared/lib';

export interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-2 text-slate-400"
    >
      <Loader2 className={cn('h-6 w-6 animate-spin', className)} />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function FullPageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[60vh] w-full items-center justify-center">
      <Spinner label={label} />
    </div>
  );
}
