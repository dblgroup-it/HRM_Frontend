import { Clapperboard, Play, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { resolveApiFileUrl } from '@shared/api';
import { cn } from '@shared/lib';

import { toneOf } from '../tones';
import type { Tutorial } from '../types/tutorials.types';
import { isNew } from '../utils';
import { clock } from '../videoUtils';
import { GuideVideoPlayer } from './GuideVideoPlayer';

/**
 * The video guides, first on the page: one card per guide that has a video,
 * the poster large with the play button on it, the parts and the length. The
 * first card leads wide. A video published this month carries a New mark.
 */
export function VideoShelf({ guides, onOpen }: { guides: Tutorial[]; onOpen: (slug: string) => void }) {
  const withVideo = guides.filter((g) => g.video);
  if (!withVideo.length) return null;
  return (
    <section aria-label="Video guides" className="space-y-3 motion-safe:animate-rise-in">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-rose-700/80">
            <Clapperboard className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" />
            Video guides · বাংলা voice
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Watch your role, step by step</h2>
        </div>
        <p className="hidden text-xs text-slate-500 sm:block">
          {withVideo.length} {withVideo.length === 1 ? 'video' : 'videos'} · Bangla and English subtitles · parts you can jump to
        </p>
      </div>
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {withVideo.map((g, i) => (
          <VideoCard key={g.slug} guide={g} onOpen={onOpen} order={i} />
        ))}
      </div>
    </section>
  );
}

function VideoCard({ guide, order = 0, onOpen }: { guide: Tutorial; order?: number; onOpen: (slug: string) => void }) {
  const lead = false;
  const [open, setOpen] = useState(false);
  const video = guide.video!;
  const tone = toneOf(guide.group);
  const poster = video.posterUrl ? resolveApiFileUrl(video.posterUrl) : null;
  const fresh = isNew(video.publishedAt);
  return (
    <>
      <article
        className={cn(
          'group relative flex overflow-hidden rounded-3xl bg-slate-900 text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.6)] ring-1 ring-black/10 transition-all duration-300 hover:shadow-[0_24px_48px_-20px_rgba(15,23,42,0.6)] motion-safe:hover:-translate-y-1 motion-safe:animate-card-in',
          'flex-col',
        )}
        style={{ animationDelay: `${120 + order * 70}ms` }}
      >
        <button
          type="button"
          onClick={() => {
            onOpen(guide.slug);
            setOpen(true);
          }}
          aria-label={`Watch the ${guide.title} video`}
          className={cn(
            'relative block shrink-0 overflow-hidden bg-slate-800 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-300/60',
            'aspect-video w-full',
          )}
        >
          {poster && (
            <img
              src={poster}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
            />
          )}
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span
              className={cn(
                'flex items-center justify-center rounded-full bg-[#ff0033] text-white shadow-xl ring-4 ring-white/20 transition-transform duration-300 motion-safe:group-hover:scale-110',
                lead ? 'h-16 w-16' : 'h-11 w-11',
              )}
            >
              <Play className={cn('ml-0.5 fill-current', lead ? 'h-7 w-7' : 'h-5 w-5')} />
            </span>
          </span>
          <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums">
            {clock(video.durationMs)}
          </span>
          {fresh && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-400 px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-emerald-950 shadow">
              <Sparkles className="h-3 w-3" />
              New
            </span>
          )}
        </button>
        <div className={cn('flex min-w-0 flex-1 flex-col', lead ? 'p-5' : 'p-4')}>
          <p className={cn('text-[0.6875rem] font-semibold uppercase tracking-[0.12em]', tone.text.replace('text-', 'text-').replace('-700', '-300'))}>
            {guide.kicker}
          </p>
          <h3 className={cn('mt-1 font-semibold leading-snug', lead ? 'text-xl' : 'text-base')}>{guide.title}</h3>
          <p className={cn('mt-1 text-sm leading-relaxed text-white/65', lead ? 'line-clamp-2' : 'line-clamp-2')}>{guide.subtitle}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {video.chapters.slice(0, lead ? 5 : 3).map((c) => (
              <button
                key={c.n}
                type="button"
                onClick={() => {
                  onOpen(guide.slug);
                  setOpen(true);
                }}
                className="rounded-md bg-white/10 px-2 py-0.5 text-[0.6875rem] text-white/80 transition-colors hover:bg-white/20"
              >
                {c.n}. {c.title}
              </button>
            ))}
            {video.chapters.length > (lead ? 5 : 3) && (
              <span className="rounded-md px-1.5 py-0.5 text-[0.6875rem] text-white/50">+{video.chapters.length - (lead ? 5 : 3)} more</span>
            )}
          </div>
          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
            <span className="text-xs text-white/60">
              {video.chapters.length} parts · {clock(video.durationMs)}
            </span>
            <button
              type="button"
              onClick={() => {
                onOpen(guide.slug);
                setOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-rose-50"
            >
              <Play className="h-4 w-4 fill-current" />
              Watch
            </button>
          </div>
        </div>
      </article>
      {open && <GuideVideoPlayer guide={guide} video={video} open={open} onClose={() => setOpen(false)} />}
    </>
  );
}
