import { useEffect, useRef } from 'react';
import { TerminalSquare } from 'lucide-react';

/** Terminal-style live log viewer that auto-scrolls to the latest line. */
export function SyncTerminal({
  lines,
  running,
}: {
  lines: string[];
  running: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [lines.length]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2">
        <TerminalSquare className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-medium text-slate-300">
          ZingHR sync · console
        </span>
        {running && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            live
          </span>
        )}
      </div>
      <div className="scrollbar-thin h-72 overflow-y-auto px-3 py-2 font-mono text-xs leading-relaxed">
        {lines.length === 0 ? (
          <p className="text-slate-500">Waiting for output…</p>
        ) : (
          lines.map((line, i) => (
            <div key={i} className={lineClass(line)}>
              {line}
            </div>
          ))
        )}
        {running && (
          <div className="text-emerald-400">
            <span className="animate-pulse">▋</span>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function lineClass(line: string): string {
  if (line.includes('✗') || line.includes('❌')) return 'text-red-400';
  if (line.includes('✅') || line.includes('✓') || line.includes('＋'))
    return 'text-emerald-400';
  if (line.includes('…') || line.includes('⚙') || line.includes('⬇'))
    return 'text-sky-300';
  if (line.includes('▶')) return 'text-brand-300';
  return 'text-slate-300';
}
