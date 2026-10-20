import { Clapperboard, Play } from 'lucide-react';
import { useState } from 'react';

import { resolveApiFileUrl } from '@shared/api';
import { cn } from '@shared/lib';

import { toneOf } from '../tones';
import type { Tutorial } from '../types/tutorials.types';
import { clock } from '../videoUtils';
import { GuideVideoPlayer } from './GuideVideoPlayer';

/**
 * The guide's video, offered on its card as a strip you cannot miss: the
 * poster with a play button, "Watch the video", the parts and the length.
 * A real button with `relative z-10`, since it sits over the card's stretched
 * link (anything less is swallowed by it). `prominent` is the featured guide's
 * larger version.
 */
export function WatchVideoButton({
  guide,
  onOpen,
  prominent = false,
  className,
}: {
  guide: Tutorial;
  onOpen?: () => void;
  prominent?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const video = guide.video;
  if (!video) return null;
  const tone = toneOf(guide.group);
  const poster = video.posterUrl ? resolveApiFileUrl(video.posterUrl) : null;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
        aria-label={`Watch the ${guide.title} video, ${video.chapters.length} parts, ${clock(video.durationMs)}`}
        className={cn(
          'group/watch relative z-10 flex w-full items-center gap-3 overflow-hidden rounded-xl border border-slate-900/10 bg-slate-900 text-left text-white shadow-sm transition-all hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5',
          prominent ? 'p-2.5 sm:gap-4 sm:p-3' : 'p-2',
          className,
        )}
      >
        {/* The poster, with the play button on it */}
        <span
          className={cn(
            'relative flex aspect-video shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-800',
            prominent ? 'w-36 sm:w-44' : 'w-28',
          )}
        >
          {poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />}
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <span
            className={cn(
              'relative flex items-center justify-center rounded-full bg-[#ff0033] text-white shadow-lg transition-transform duration-300 motion-safe:group-hover/watch:scale-110',
              prominent ? 'h-11 w-11' : 'h-9 w-9',
            )}
          >
            <Play className={cn('ml-0.5 fill-current', prominent ? 'h-5 w-5' : 'h-4 w-4')} />
          </span>
          <span className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[0.625rem] font-semibold tabular-nums">
            {clock(video.durationMs)}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className={cn('flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-rose-300')}>
            <Clapperboard className="h-3 w-3" />
            Video tutorial
          </span>
          <span className={cn('mt-0.5 block font-semibold leading-snug', prominent ? 'text-base sm:text-lg' : 'text-sm')}>
            Watch the video
          </span>
          <span className="mt-0.5 block text-xs text-white/70">
            {video.chapters.length} parts · {clock(video.durationMs)} · বাংলা voice, Bangla and English subtitles
          </span>
          {prominent && (
            <span className="mt-2 hidden flex-wrap gap-1 sm:flex">
              {video.chapters.slice(0, 4).map((c) => (
                <span key={c.n} className="rounded-md bg-white/10 px-1.5 py-0.5 text-[0.6875rem] text-white/80">
                  {c.n}. {c.title}
                </span>
              ))}
              {video.chapters.length > 4 && (
                <span className="rounded-md px-1.5 py-0.5 text-[0.6875rem] text-white/60">+{video.chapters.length - 4} more</span>
              )}
            </span>
          )}
        </span>
        <span
          aria-hidden
          className={cn('mr-1 hidden h-2.5 w-2.5 shrink-0 rounded-full sm:block', tone.dot)}
        />
      </button>
      {open && <GuideVideoPlayer guide={guide} video={video} open={open} onClose={() => setOpen(false)} />}
    </>
  );
}
