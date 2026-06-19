import { DotLottieReact } from '@lottiefiles/dotlottie-react';

import { cn } from '@shared/lib';
import loaderSrc from '@assets/loader.lottie?url';

export interface SpinnerProps {
  className?: string;
  /** Diameter in px. Defaults to 72. */
  size?: number;
  /** Optional text below the animation. */
  label?: string;
}

/** Lottie-powered loader using the project's custom loader.lottie animation. */
export function Spinner({ className, size = 72, label }: SpinnerProps) {
  const player = (
    <DotLottieReact
      src={loaderSrc}
      loop
      autoplay
      style={{ width: size, height: size }}
    />
  );

  if (!label) {
    return <div className={cn(className)}>{player}</div>;
  }

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {player}
      <p className="text-sm font-medium text-slate-400">{label}</p>
    </div>
  );
}

export function FullPageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center gap-2">
      <Spinner size={110} />
      <p className="text-sm font-medium text-slate-400">{label}</p>
    </div>
  );
}
