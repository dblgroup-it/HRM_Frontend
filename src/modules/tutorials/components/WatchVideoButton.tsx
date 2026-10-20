import { Play } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@shared/lib';

import type { Tutorial } from '../types/tutorials.types';
import { clock } from '../videoUtils';
import { GuideVideoPlayer } from './GuideVideoPlayer';

/**
 * "Watch · 9 parts · 19:02" on a guide that has a video; opens the player.
 * A real button with `relative z-10`, since it sits over the card's stretched
 * link (anything less is swallowed by it).
 */
export function WatchVideoButton({
  guide,
  onOpen,
  prominent = false,
  className,
}: {
  guide: Tutorial;
  onOpen?: () => void;
  /** The featured guide's large button. */
  prominent?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const video = guide.video;
  if (!video) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
        className={cn(
          'relative z-10 inline-flex items-center gap-2 rounded-xl font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2',
          prominent
            ? 'bg-slate-900 px-4 py-2.5 text-sm text-white shadow-sm hover:bg-slate-800'
            : 'bg-slate-900 px-2.5 py-1.5 text-xs text-white hover:bg-slate-800',
          className,
        )}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ff0033]">
          <Play className="ml-px h-3 w-3 fill-current" />
        </span>
        Watch video
        <span className="font-normal text-white/70">
          · {video.chapters.length} parts · {clock(video.durationMs)}
        </span>
      </button>
      {open && <GuideVideoPlayer guide={guide} video={video} open={open} onClose={() => setOpen(false)} />}
    </>
  );
}
