import { ArrowUpRight, ChevronDown, CornerDownRight, Download, FileText, ListOrdered, Play, Sparkles } from 'lucide-react';
import { useId, useState } from 'react';

import { resolveApiFileUrl } from '@shared/api';
import { cn } from '@shared/lib';

import { toneOf } from '../tones';
import type { Tutorial } from '../types/tutorials.types';
import { atPage, matchingChapters } from '../utils';
import { clock } from '../videoUtils';
import { ChapterList } from './ChapterList';
import { GuideVideoPlayer } from './GuideVideoPlayer';
import { OpenedTick } from './GuideCover';

/**
 * A guide as a plain white tile led by its cover: the cover page's band
 * fills the top of the card edge to edge (owner's choice, 2026-10-21 — no
 * tinted shelf, nothing drawn over the logo), then the title, one line of
 * facts (the band already says what the guide is for) and one row of
 * actions: Open,
 * PDF, Chapters, and Watch where the guide has a video. The cover drifts
 * larger under the pointer and the card lifts. `order` staggers the
 * entrance; `wide` is the master guide, two columns wide.
 */
export function GuideCard({
  guide,
  order,
  opened,
  onOpen,
  query,
  wide = false,
  fresh = false,
}: {
  guide: Tutorial;
  order: number;
  opened: boolean;
  onOpen: () => void;
  query: string;
  wide?: boolean;
  /** Published or updated this month. */
  fresh?: boolean;
}) {
  const tone = toneOf(guide.group);
  const [showChapters, setShowChapters] = useState(false);
  const [playing, setPlaying] = useState(false);
  const chaptersId = useId();
  const hits = matchingChapters(guide, query);
  const base = resolveApiFileUrl(guide.url);
  const video = guide.video;
  return (
    <div className={cn('motion-safe:animate-rise-in', wide && 'sm:col-span-2')} style={{ animationDelay: `${160 + Math.min(order, 8) * 60}ms` }}>
      <article className="group relative isolate flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)] transition-all duration-300 hover:border-slate-300 hover:shadow-[0_26px_50px_-26px_rgba(15,23,42,0.45)] motion-safe:hover:-translate-y-1">
        {/* The cover's band, edge to edge — the band is 800×490 on the thumbnail, so this box shows all of it.
            Rounded and masked itself: the image scales on hover, and a transformed child escapes an ancestor's rounded clip in Safari (square corner). */}
        <div className="relative isolate aspect-[800/490] overflow-hidden rounded-t-3xl bg-slate-100 [-webkit-mask-image:-webkit-radial-gradient(white,black)]">
          {guide.thumbUrl ? (
            <img
              src={resolveApiFileUrl(guide.thumbUrl)}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <FileText className="h-7 w-7 text-slate-300" />
            </div>
          )}
          <div className="absolute right-3 top-3 flex items-center gap-1.5">{opened && <OpenedTick />}</div>
          {video && (
            <button
              type="button"
              onClick={() => {
                onOpen();
                setPlaying(true);
              }}
              aria-label={`Watch the ${guide.title} video, ${video.chapters.length} parts, ${clock(video.durationMs)}`}
              className="absolute bottom-3 right-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-3 text-xs font-semibold text-slate-900 shadow-lg transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ff0033] text-white">
                <Play className="ml-px h-3 w-3 fill-current" />
              </span>
              Video · {clock(video.durationMs)}
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <a
              href={base}
              target="_blank"
              rel="noopener noreferrer"
              title="Opens in a new tab"
              onClick={onOpen}
              className="text-base font-semibold leading-snug text-slate-900 after:absolute after:inset-0 after:rounded-3xl after:content-[''] focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand-300 sm:text-lg"
            >
              {guide.title}
            </a>
            {fresh && (
              <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <Sparkles className="h-3 w-3" />
                Updated
              </span>
            )}
          </div>
          {/* The band already says what the guide is for, so the body keeps to the facts. */}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-400">
            <span className={cn('font-semibold uppercase tracking-[0.1em]', tone.text)}>{guide.kicker}</span>
            <span>· {guide.pages} pages · {guide.chapters.length} chapters</span>
            {video && <span>· video in {video.chapters.length} parts</span>}
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

          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
            {/* Real links and buttons, above the card's stretched link. */}
            <a
              href={base}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onOpen}
              className="relative z-10 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            >
              Open guide
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <a
              href={resolveApiFileUrl(guide.downloadUrl)}
              onClick={onOpen}
              title={`Download ${guide.title}`}
              className="relative z-10 inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </a>
            {guide.chapters.length > 0 && (
              <button
                type="button"
                aria-expanded={showChapters}
                aria-controls={chaptersId}
                onClick={() => setShowChapters((v) => !v)}
                className="relative z-10 ml-auto inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <ListOrdered className="h-3.5 w-3.5" />
                Chapters
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-300', showChapters && 'rotate-180')} />
              </button>
            )}
          </div>

          <div
            id={chaptersId}
            className={cn('grid transition-[grid-template-rows] duration-300 ease-out', showChapters ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
          >
            <div className="overflow-hidden" inert={!showChapters}>
              <div className="mt-3 rounded-xl bg-slate-50 p-1.5 ring-1 ring-inset ring-slate-200/60">
                <ChapterList key={showChapters ? 'open' : 'shut'} guide={guide} onOpen={onOpen} columns={wide} />
              </div>
            </div>
          </div>
        </div>
      </article>
      {playing && video && <GuideVideoPlayer guide={guide} video={video} open={playing} onClose={() => setPlaying(false)} />}
    </div>
  );
}
