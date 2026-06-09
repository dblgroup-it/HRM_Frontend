import { Loader2, Sparkles } from 'lucide-react';

/** Full-screen blocking overlay shown during a slow, click-sensitive action. */
export function BusyOverlay({
  show,
  label,
  sublabel,
  variant = 'default',
}: {
  show: boolean;
  label?: string;
  sublabel?: string;
  variant?: 'default' | 'ai';
}) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-white/80 backdrop-blur-sm">
      {variant === 'ai' ? (
        <div className="relative flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-violet-400/25" />
          <span className="absolute inset-1 rounded-full bg-[conic-gradient(from_0deg,#7c3aed,#22d3ee,#8cc63f,#7c3aed)] opacity-70 blur-[6px] animate-spin-slow" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
            <Sparkles className="h-7 w-7 animate-pulse text-violet-600" />
          </span>
        </div>
      ) : (
        <Loader2 className="h-9 w-9 animate-spin text-brand-600" />
      )}
      {label && (
        <p className="text-base font-semibold text-slate-700">{label}</p>
      )}
      {sublabel && <p className="-mt-2 text-sm text-slate-500">{sublabel}</p>}
    </div>
  );
}
