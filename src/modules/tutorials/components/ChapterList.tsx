import { ArrowUpRight } from 'lucide-react';

import { resolveApiFileUrl } from '@shared/api';
import { cn } from '@shared/lib';

import { toneOf } from '../tones';
import type { Tutorial } from '../types/tutorials.types';
import { atPage } from '../utils';

/** A guide's chapters, cascading in; each opens the PDF at the page it starts on. */
export function ChapterList({
  guide,
  onOpen,
  columns = false,
  marked,
}: {
  guide: Tutorial;
  onOpen: () => void;
  /** Two columns on mid-size screens, one again beside the cover on wide ones. */
  columns?: boolean;
  /** Chapters a search found, picked out like a highlighter would. */
  marked?: ReadonlySet<string>;
}) {
  const tone = toneOf(guide.group);
  const base = resolveApiFileUrl(guide.url);
  return (
    <ol className={cn('grid grid-cols-1 gap-0.5', columns && 'sm:grid-cols-2 sm:gap-x-3 xl:grid-cols-1')}>
      {guide.chapters.map((c, i) => (
        <li
          key={`${i}-${c.title}`}
          className="motion-safe:animate-card-in"
          style={{ animationDelay: `${120 + i * 45}ms` }}
        >
          <a
            href={atPage(base, c.page)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onOpen}
            aria-label={`${c.title}${c.page ? `, page ${c.page}` : ''} — opens in a new tab`}
            className={cn(
              'group/ch relative z-10 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[0.8125rem] transition-colors hover:bg-white hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
              marked?.has(c.title)
                ? 'bg-amber-50 font-medium text-slate-900 ring-1 ring-inset ring-amber-200'
                : 'text-slate-600',
            )}
          >
            <span
              className={cn(
                'inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-md px-1 text-[0.6875rem] font-semibold tabular-nums ring-1 ring-inset',
                tone.badge,
              )}
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate" title={c.title}>
              {c.title}
            </span>
            {c.page && (
              <span className="shrink-0 text-[0.6875rem] tabular-nums text-slate-400">p. {c.page}</span>
            )}
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform duration-200 group-hover/ch:-translate-y-0.5 group-hover/ch:translate-x-0.5 group-hover/ch:text-slate-500" />
          </a>
        </li>
      ))}
    </ol>
  );
}
