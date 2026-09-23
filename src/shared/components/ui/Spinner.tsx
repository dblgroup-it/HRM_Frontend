import { DotLottieReact, setWasmUrl } from '@lottiefiles/dotlottie-react';
import wasmUrl from '@lottiefiles/dotlottie-web/dotlottie-player.wasm?url';

import { cn } from '@shared/lib';
import { Portal } from './Portal';
import loaderSrc from '@assets/loader.lottie?url';

// Serve the player's WASM runtime from our own origin. By default it is
// fetched from jsdelivr/unpkg, which production's CSP (connect-src 'self')
// blocks, so the loader rendered nothing there while working in dev.
setWasmUrl(wasmUrl);

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

/**
 * A page-level loader, centred on the viewport — not on the page's own
 * container, which on a long page put it below the fold. The placeholder
 * holds the page's height so nothing jumps when the content arrives.
 */
export function FullPageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="min-h-[60vh] w-full" aria-busy="true">
      <Portal>
        <div
          role="status"
          className="pointer-events-none fixed inset-0 z-[90] flex flex-col items-center justify-center gap-2"
        >
          <Spinner size={110} />
          <p className="text-sm font-medium text-slate-400">{label}</p>
        </div>
      </Portal>
    </div>
  );
}
