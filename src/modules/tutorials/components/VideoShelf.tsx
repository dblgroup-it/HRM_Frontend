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
 * The video guides, first on the page: one poster-led card per guide that
 * has a video, side by side. The poster grows under the pointer and the
 * play ring pulses; the body says only what it is and how long. A video
 * published this month carries a New mark.
 */
export function VideoShelf({ guides, onOpen }: { guides: Tutorial[]; onOpen: (slug: string) => void }) {
  const withVideo = guides.filter((g) => g.video);
  const [playing, setPlaying] = useState<Tutorial | null>(null);
  if (!withVideo.length) return null;
  const play = (guide: Tutorial) => {
    onOpen(guide.slug);
    setPlaying(guide);
  };

  return (
    <section aria-label="Video guides" className="space-y-3 motion-safe:animate-rise-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-rose-700/80">
            <Clapperboard className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" />
            Video guides
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Watch your role, step by step</h2>
        </div>
        <p className="text-xs text-slate-500">বাংলা voice · Bangla and English subtitles · 1080p</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {withVideo.map((g, i) => (
          <VideoCard key={g.slug} guide={g} onPlay={play} order={i} />
        ))}
      </div>

      {playing?.video && <GuideVideoPlayer key={playing.slug} guide={playing} video={playing.video} open onClose={() => setPlaying(null)} />}
    </section>
  );
}

function VideoCard({ guide, order = 0, onPlay }: { guide: Tutorial; order?: number; onPlay: (guide: Tutorial) => void }) {
  const video = guide.video!;
  const tone = toneOf(guide.group);
  const poster = video.posterUrl ? resolveApiFileUrl(video.posterUrl) : null;
  const fresh = isNew(video.publishedAt);
  return (
    <div className="motion-safe:animate-card-in" style={{ animationDelay: `${140 + order * 80}ms` }}>
      <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.4)] transition-all duration-300 hover:border-slate-300 hover:shadow-[0_26px_50px_-26px_rgba(15,23,42,0.45)] motion-safe:hover:-translate-y-1">
        <button
          type="button"
          onClick={() => onPlay(guide)}
          aria-label={`Watch the ${guide.title} video, ${video.chapters.length} parts, ${clock(video.durationMs)}`}
          className="relative block aspect-video w-full overflow-hidden bg-slate-900 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-300/60"
        >
          {poster && (
            <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.05]" />
          )}
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="relative flex items-center justify-center">
              <span className="absolute h-14 w-14 rounded-full bg-white/25 motion-safe:animate-ping [animation-duration:2.4s]" />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#ff0033] text-white shadow-2xl ring-4 ring-white/25 transition-transform duration-300 motion-safe:group-hover:scale-110">
                <Play className="ml-0.5 h-6 w-6 fill-current" />
              </span>
            </span>
          </span>
          <span className="absolute bottom-3 right-3 rounded-md bg-black/70 px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums text-white">{clock(video.durationMs)}</span>
          {fresh && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-400 px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-emerald-950 shadow">
              <Sparkles className="h-3 w-3" />
              New
            </span>
          )}
        </button>
        <div className="flex flex-1 items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className={cn('text-[0.6875rem] font-semibold uppercase tracking-[0.12em]', tone.text)}>{guide.kicker}</p>
            <h3 className="mt-0.5 truncate text-base font-semibold leading-snug text-slate-900">{guide.title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {video.chapters.length} parts · {clock(video.durationMs)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onPlay(guide)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
          >
            <Play className="h-4 w-4 fill-current" />
            Watch
          </button>
        </div>
      </article>
    </div>
  );
}
