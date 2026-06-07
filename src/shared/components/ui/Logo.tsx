import logoUrl from '@assets/logo.png';
import { cn } from '@shared/lib';

export interface LogoProps {
  /** Show the "HRM" system label beside the mark. */
  withLabel?: boolean;
  /** Render the wordmark in white (for dark backgrounds). */
  inverted?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const markSizes = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-12 w-12',
};

/** DBL Group brand mark + optional HRM system label. */
export function Logo({
  withLabel = true,
  inverted = false,
  className,
  size = 'md',
}: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img
        src={logoUrl}
        alt="DBL Group"
        className={cn('shrink-0 object-contain', markSizes[size])}
      />
      {withLabel && (
        <div className="leading-tight">
          <span
            className={cn(
              'block text-sm font-medium tracking-tight',
              inverted ? 'text-white' : 'text-ink'
            )}
          >
            DBL HRM
          </span>
          <span
            className={cn(
              'block text-[10px] font-medium uppercase tracking-[0.18em]',
              inverted ? 'text-white/70' : 'text-slate-400'
            )}
          >
            Recruitment Suite
          </span>
        </div>
      )}
    </div>
  );
}
