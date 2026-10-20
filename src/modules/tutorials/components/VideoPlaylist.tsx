import { ArrowUpRight, ListVideo, Play } from 'lucide-react';
import { useState } from 'react';

import { Button, Modal } from '@shared/components/ui';

import { useCanEmbedVideos } from '../hooks/useTutorialVideos';
import type { TutorialVideos } from '../types/tutorials.types';

/**
 * The video tutorials — one YouTube playlist, the same for everyone — as a
 * one-line strip at the foot of the banner (owner, 2026-10-21: at the foot
 * of the page nobody used it): a small play tile, the playlist's name and
 * channel, Play and Open on YouTube. Play opens it in a player over the
 * page; where the site's security policy does not allow YouTube's player
 * yet, Play opens the playlist on YouTube instead, so it never shows a
 * refused frame.
 */
export function VideoPlaylist({ videos }: { videos: TutorialVideos }) {
  const canEmbed = useCanEmbedVideos();
  const [playing, setPlaying] = useState(false);

  return (
    <>
      <div aria-label="Video tutorials" className="flex flex-wrap items-center gap-3 sm:gap-4">
        <PlayTile videos={videos} canEmbed={canEmbed} onPlay={() => setPlaying(true)} />
        <div className="min-w-0 flex-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-rose-700/80">YouTube playlist · for everyone</p>
          <p className="truncate text-sm font-semibold text-slate-900">
            {videos.title}
            {videos.channel && <span className="font-normal text-slate-500"> · {videos.channel}</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canEmbed ? (
            <>
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2"
              >
                <Play className="h-4 w-4 fill-current" />
                Play
              </button>
              <a
                href={videos.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                YouTube
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </>
          ) : (
            <a
              href={videos.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2"
            >
              <Play className="h-4 w-4 fill-current" />
              Watch on YouTube
              <ArrowUpRight className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      <Modal
        open={playing}
        onClose={() => setPlaying(false)}
        title={videos.title}
        size="xl"
        footer={
          <>
            <a
              href={videos.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mr-auto inline-flex items-center gap-1.5 self-center text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              {videos.channel ? `${videos.channel} · ` : ''}Open on YouTube
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <Button variant="outline" size="sm" onClick={() => setPlaying(false)}>
              Close
            </Button>
          </>
        }
      >
        {playing && (
          <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
            <iframe
              src={`${videos.embedUrl}&autoplay=1&rel=0`}
              title={videos.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 h-full w-full"
            />
          </div>
        )}
      </Modal>
    </>
  );
}

/** A small dark screen with the red play button — a link to YouTube when the page cannot play it itself. */
function PlayTile({ videos, canEmbed, onPlay }: { videos: TutorialVideos; canEmbed: boolean; onPlay: () => void }) {
  const inner = (
    <>
      <span aria-hidden className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:10px_10px]" />
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#ff0033] text-white shadow transition-transform duration-300 motion-safe:group-hover/tile:scale-110">
        <Play className="ml-px h-3.5 w-3.5 fill-current" />
      </span>
      <span className="absolute bottom-1 right-1.5 inline-flex items-center gap-0.5 text-[0.5625rem] font-medium text-white/80">
        <ListVideo className="h-2.5 w-2.5" />
      </span>
    </>
  );
  const tile =
    'group/tile relative flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-900 ring-1 ring-black/5 transition-shadow hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300';
  return canEmbed ? (
    <button type="button" onClick={onPlay} aria-label={`Play ${videos.title}`} className={tile}>
      {inner}
    </button>
  ) : (
    <a href={videos.url} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${videos.title} on YouTube`} className={tile}>
      {inner}
    </a>
  );
}
