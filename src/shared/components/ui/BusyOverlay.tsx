import { Loader2 } from 'lucide-react';

/** Full-screen blocking overlay shown during a slow, click-sensitive action. */
export function BusyOverlay({
  show,
  label,
}: {
  show: boolean;
  label?: string;
}) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-white/75 backdrop-blur-sm">
      <Loader2 className="h-9 w-9 animate-spin text-brand-600" />
      {label && (
        <p className="text-sm font-medium text-slate-600">{label}</p>
      )}
    </div>
  );
}
