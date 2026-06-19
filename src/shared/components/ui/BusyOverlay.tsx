import { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';

import { Spinner } from './Spinner';

const SLIDE_MS = 180;

/**
 * Ticker-style label swap: old text slides up out, new text rises from below.
 * Uses a two-row wrapper that translates up by one row — no opacity overlap.
 */
function AnimatedLabel({
  text,
  textClass,
  rowH,
}: {
  text: string;
  textClass: string;
  rowH: number; // px height of one text row
}) {
  const [current, setCurrent] = useState(text);
  const [prev, setPrev] = useState<string | null>(null);
  const prevRef = useRef(text);

  useEffect(() => {
    if (text === prevRef.current) return;
    const old = prevRef.current;
    prevRef.current = text;
    setPrev(old);
    setCurrent(text);
    const id = setTimeout(() => setPrev(null), SLIDE_MS + 30);
    return () => clearTimeout(id);
  }, [text]);

  const row = (label: string) => (
    <div
      style={{
        height: rowH,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
      }}
      className={textClass}
    >
      {label}
    </div>
  );

  return (
    <>
      {/* Inject keyframe once — only present while overlay is visible */}
      <style>{`
        @keyframes _overlayTicker {
          from { transform: translateY(0); }
          to   { transform: translateY(-50%); }
        }
      `}</style>

      <div style={{ height: rowH, overflow: 'hidden' }}>
        {prev !== null ? (
          /* Two-row stack: prev on top, current below. Slide up one row. */
          <div
            key={current}
            style={{
              display: 'flex',
              flexDirection: 'column',
              animation: `_overlayTicker ${SLIDE_MS}ms cubic-bezier(0.4,0,0.2,1) forwards`,
            }}
          >
            {row(prev)}
            {row(current)}
          </div>
        ) : (
          row(current)
        )}
      </div>
    </>
  );
}

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
        <Spinner size={130} />
      )}
      {label && (
        <AnimatedLabel
          text={label}
          rowH={28}
          textClass="text-base font-semibold text-slate-700"
        />
      )}
      {sublabel && (
        <AnimatedLabel
          text={sublabel}
          rowH={20}
          textClass="text-sm text-slate-500"
        />
      )}
    </div>
  );
}
