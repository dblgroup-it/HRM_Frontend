import { ArrowUpRight, ListVideo, Play } from 'lucide-react';
import { useState } from 'react';

import { Button, Modal } from '@shared/components/ui';
import { cn } from '@shared/lib';

import { useCanEmbedVideos } from '../hooks/useTutorialVideos';
import type { TutorialVideos } from '../types/tutorials.types';

const kicker = 'text-[0.6875rem] font-semibold uppercase tracking-[0.12em]';

/**
 * The video tutorials — one YouTube playlist, the same for everyone. Play
 * opens it in a player over the page; where the site's security policy does
 * not allow YouTube's player yet, Play opens the playlist on YouTube instead,
 * so it never shows a refused frame.
 */
export function VideoPlaylist({ videos }: { videos: TutorialVideos }) {
  const canEmbed = useCanEmbedVideos();
  const [playing, setPlaying] = useState(false);
  const from = videos.channel ? ` from the ${videos.channel}` : '';

  return (
    // The entrance plays on the wrapper, so it never holds the tile's own hover motion.
    <div className="motion-safe:animate-rise-in" style={{ animationDelay: '80ms' }}>
      <section
        aria-label="Video tutorials"
        className="group flex flex-col gap-4 rounded-3xl border border-rose-100 bg-rose-50/50 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5"
      >
        <PlayTile videos={videos} canEmbed={canEmbed} onPlay={() => setPlaying(true)} />

        <div className="min-w-0 flex-1">
          <p className={cn(kicker, 'text-rose-700/80')}>Video tutorials · for everyone</p>
          <h2 className="mt-1 text-lg font-semibold leading-snug tracking-tight text-slate-900">{videos.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Step-by-step videos of TalentHub{from}. Watch them alongside your guides, whatever your role.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canEmbed ? (
            <>
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2"
              >
                <Play className="h-4 w-4 fill-current" />
                Play videos
              </button>
              <a
                href={videos.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                Open on YouTube
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </>
          ) : (
            <a
              href={videos.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2"
            >
              <Play className="h-4 w-4 fill-current" />
              Watch on YouTube
              <ArrowUpRight className="h-4 w-4" />
            </a>
          )}
        </div>
      </section>

      <Modal open={playing} onClose={() => setPlaying(false)} title={videos.title} size="xl" footer={
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
      }>
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
    </div>
  );
}

/** A small dark screen with the play button — a link to YouTube when the page cannot play it itself. */
function PlayTile({
  videos,
  canEmbed,
  onPlay,
}: {
  videos: TutorialVideos;
  canEmbed: boolean;
  onPlay: () => void;
}) {
  const inner = (
    <>
      <span
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:14px_14px]"
      />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#ff0033] text-white shadow-lg transition-transform duration-300 motion-safe:group-hover/tile:scale-110">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-[#ff0033]/40 opacity-0 motion-safe:group-hover/tile:animate-ping motion-safe:group-hover/tile:opacity-100"
        />
        <Play className="relative ml-0.5 h-5 w-5 fill-current" />
      </span>
      <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[0.625rem] font-medium text-white">
        <ListVideo className="h-3 w-3" />
        Playlist
      </span>
    </>
  );
  const tile =
    'group/tile relative flex aspect-video w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-black/5 transition-shadow hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 sm:w-52';
  return canEmbed ? (
    <button type="button" onClick={onPlay} aria-label={`Play ${videos.title}`} className={tile}>
      {inner}
    </button>
  ) : (
    <a
      href={videos.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Watch ${videos.title} on YouTube`}
      className={tile}
    >
      {inner}
    </a>
  );
}
