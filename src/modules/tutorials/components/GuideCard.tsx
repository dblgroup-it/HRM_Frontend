import { ArrowUpRight, ChevronDown, CornerDownRight, Download, ListOrdered } from 'lucide-react';
import { useId, useState } from 'react';

import { resolveApiFileUrl } from '@shared/api';
import { cn } from '@shared/lib';

import { toneOf } from '../tones';
import type { Tutorial } from '../types/tutorials.types';
import { atPage, matchingChapters, readingTime } from '../utils';
import { ChapterList } from './ChapterList';
import { GuideCover, OpenedTick } from './GuideCover';

/**
 * One guide, washed in its stage's tint. The whole card opens it; Chapters
 * unfolds the chapter list in place, and Download sits above the card's link.
 * `order` staggers the cards' entrance.
 */
export function GuideCard({
  guide,
  order,
  opened,
  onOpen,
  query,
}: {
  guide: Tutorial;
  order: number;
  opened: boolean;
  onOpen: () => void;
  query: string;
}) {
  const tone = toneOf(guide.group);
  const [showChapters, setShowChapters] = useState(false);
  const chaptersId = useId();
  const hits = matchingChapters(guide, query);
  const base = resolveApiFileUrl(guide.url);
  return (
    // The entrance plays on the wrapper, so it never holds the card's hover lift.
    <div className="motion-safe:animate-rise-in" style={{ animationDelay: `${160 + Math.min(order, 6) * 70}ms` }}>
      <article
        className={cn(
          'group relative flex flex-col rounded-2xl border p-4 transition-all duration-300 hover:shadow-[0_16px_32px_-20px_rgba(15,23,42,0.4)] motion-safe:hover:-translate-y-1 sm:p-5',
          tone.card,
        )}
      >
        <div className="flex gap-4">
          <GuideCover
            guide={guide}
            className="w-[76px] transition-transform duration-300 ease-out motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:-rotate-2 sm:w-[88px]"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-2">
              <p className={cn('text-[0.6875rem] font-semibold uppercase tracking-[0.1em] opacity-80', tone.text)}>
                {guide.kicker}
              </p>
              {opened && <OpenedTick />}
            </div>
            <a
              href={base}
              target="_blank"
              rel="noopener noreferrer"
              title="Opens in a new tab"
              onClick={onOpen}
              className="mt-1 text-base font-semibold leading-snug text-slate-900 after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand-300"
            >
              {guide.title}
            </a>
            <p className="mt-1 line-clamp-2 min-h-[2.85rem] text-sm leading-relaxed text-slate-500">{guide.subtitle}</p>
            <p className="mt-2 text-xs text-slate-400">
              {guide.pages} pages
              {guide.chapters.length > 0 && <> · {guide.chapters.length} chapters</>} · ~{readingTime(guide.pages)}{' '}
              read
            </p>
            {hits.length > 0 && (
              <ul className="mt-2.5 space-y-1">
                {hits.slice(0, 3).map((c) => (
                  <li key={c.title} className="motion-safe:animate-card-in">
                    <a
                      href={atPage(base, c.page)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onOpen}
                      className="relative z-10 inline-flex max-w-full items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-slate-800 ring-1 ring-inset ring-amber-200 transition-colors hover:bg-white"
                    >
                      <CornerDownRight className="h-3 w-3 shrink-0 text-amber-500" />
                      <span className="truncate">{c.title}</span>
                      {c.page && <span className="shrink-0 font-normal text-slate-400">p. {c.page}</span>}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          {guide.chapters.length > 0 ? (
            <button
              type="button"
              aria-expanded={showChapters}
              aria-controls={chaptersId}
              onClick={() => setShowChapters((v) => !v)}
              className="relative z-10 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-white/80 hover:text-slate-900"
            >
              <ListOrdered className="h-3.5 w-3.5" />
              Chapters
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition-transform duration-300', showChapters && 'rotate-180')}
              />
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1">
            <a
              href={resolveApiFileUrl(guide.downloadUrl)}
              onClick={onOpen}
              title={`Download ${guide.title}`}
              className="relative z-10 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-white/80 hover:text-slate-800"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
            {/* A real link: its moving arrow would otherwise sit above the card's link and swallow the click. */}
            <a
              href={base}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onOpen}
              className={cn(
                'relative z-10 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-white group-hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
                tone.text,
              )}
            >
              Open
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>

        <div
          id={chaptersId}
          className={cn(
            'grid transition-[grid-template-rows] duration-300 ease-out',
            showChapters ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className="overflow-hidden" inert={!showChapters}>
            <div className="mt-2 rounded-xl bg-white/80 p-1.5 ring-1 ring-inset ring-slate-200/60">
              {/* Remounted on opening, so the chapters cascade in each time. */}
              <ChapterList key={showChapters ? 'open' : 'shut'} guide={guide} onOpen={onOpen} />
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
