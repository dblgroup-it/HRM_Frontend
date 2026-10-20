import { ArrowUpRight, BookOpen, Clock3, Download, FileText, ListOrdered } from 'lucide-react';
import type { ReactNode } from 'react';

import { resolveApiFileUrl } from '@shared/api';
import { cn } from '@shared/lib';

import { useTilt } from '../hooks/useMotion';
import { toneOf } from '../tones';
import type { Tutorial } from '../types/tutorials.types';
import { fileSize, matchingChapters, readingTime } from '../utils';
import { ChapterList } from './ChapterList';
import { WatchVideoButton } from './WatchVideoButton';
import { GuideCover, OpenedTick } from './GuideCover';

const kicker = 'text-[0.6875rem] font-semibold uppercase tracking-[0.1em]';

/**
 * The guide to start with — the master document, or the person's only guide —
 * large, its cover leaning toward the pointer, its chapters beside it. The
 * whole card opens the guide; chapters and Download sit above that link.
 */
export function FeaturedGuide({
  guide,
  lead,
  opened,
  onOpen,
  query,
}: {
  guide: Tutorial;
  lead: string;
  opened: boolean;
  onOpen: () => void;
  query: string;
}) {
  const tone = toneOf(guide.group);
  const tilt = useTilt<HTMLElement>();
  const marked = new Set(matchingChapters(guide, query).map((c) => c.title));
  return (
    // The entrance plays on the wrapper, so it never holds the card's own transforms.
    <div className="motion-safe:animate-rise-in" style={{ animationDelay: '120ms' }}>
      <article
        ref={tilt.ref}
        onPointerMove={tilt.onPointerMove}
        onPointerLeave={tilt.onPointerLeave}
        className={cn(
          'group relative grid grid-cols-1 gap-6 rounded-3xl border p-5 transition-colors sm:grid-cols-[auto_minmax(0,1fr)] sm:p-7 xl:grid-cols-[auto_minmax(0,1fr)_23rem]',
          tone.card,
        )}
      >
        <GuideCover guide={guide} tilt className="w-[128px] sm:w-[148px] xl:w-[164px]" />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 ring-inset',
                kicker,
                tone.badge,
              )}
            >
              <BookOpen className="h-3.5 w-3.5" />
              {lead}
            </span>
            {opened && <OpenedTick />}
          </div>
          <p className={cn('mt-3 text-slate-400', kicker)}>{guide.kicker}</p>
          <a
            href={resolveApiFileUrl(guide.url)}
            target="_blank"
            rel="noopener noreferrer"
            title="Opens in a new tab"
            onClick={onOpen}
            className="mt-1 block text-2xl font-semibold tracking-tight text-slate-900 after:absolute after:inset-0 after:rounded-3xl after:content-[''] focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand-300 sm:text-[1.75rem] sm:leading-tight"
          >
            {guide.title}
          </a>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{guide.subtitle}</p>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-400">For: {guide.audience}</p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <Fact icon={FileText}>{guide.pages} pages</Fact>
            {guide.chapters.length > 0 && <Fact icon={ListOrdered}>{guide.chapters.length} chapters</Fact>}
            <Fact icon={Clock3}>~{readingTime(guide.pages)} read</Fact>
            <Fact icon={Download}>{fileSize(guide.bytes)} PDF</Fact>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {/* A real link, above the card's: drawn as a button over the stretched link, a plain label caught the click and went nowhere. */}
            <a
              href={resolveApiFileUrl(guide.url)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onOpen}
              className="relative z-10 inline-flex items-center gap-2 overflow-hidden rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 group-hover:bg-brand-700"
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 motion-safe:group-hover:animate-btn-sheen"
              />
              Open guide
              <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
            <a
              href={resolveApiFileUrl(guide.downloadUrl)}
              onClick={onOpen}
              className="relative z-10 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
            <WatchVideoButton guide={guide} prominent />
          </div>
        </div>

        {guide.chapters.length > 0 && (
          <div className="rounded-2xl bg-white/80 p-2.5 ring-1 ring-inset ring-slate-200/60 sm:col-span-2 xl:col-span-1">
            <p className={cn('px-2 pb-1.5 pt-1 text-slate-400', kicker)}>Inside this guide</p>
            <ChapterList guide={guide} onOpen={onOpen} columns marked={marked} />
          </div>
        )}
      </article>
    </div>
  );
}

function Fact({ icon: Icon, children }: { icon: typeof FileText; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-xs text-slate-600 ring-1 ring-inset ring-slate-200/70">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {children}
    </span>
  );
}
