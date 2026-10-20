import {
  Captions,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Maximize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { resolveApiFileUrl } from '@shared/api';
import { Modal } from '@shared/components/ui';
import { cn } from '@shared/lib';

import { toneOf } from '../tones';
import type { Tutorial, TutorialVideo } from '../types/tutorials.types';
import { SPEEDS, chapterAt, clock, partLengths, speedLabel } from '../videoUtils';

const SPEED_KEY = 'hrm.tutorials.videoSpeed';
const VOLUME_KEY = 'hrm.tutorials.videoVolume';
const SUBS_KEY = 'hrm.tutorials.videoSubs';
const LANG_NAMES: Record<string, string> = { bn: 'বাংলা', en: 'English' };

/**
 * A guide's video, played part by part. The video sits on the left with its
 * own control bar — play, a seek bar with a tick where each part starts, the
 * clock, a speed menu, subtitles and full screen — and the parts list on the
 * right, the one playing lit in the guide's tint. Space plays and pauses,
 * ← → jump ten seconds, [ and ] change the part.
 */
export function GuideVideoPlayer({
  guide,
  video,
  open,
  onClose,
  initialPart = 0,
}: {
  guide: Tutorial;
  video: TutorialVideo;
  open: boolean;
  onClose: () => void;
  /** The part to start on (0-based). */
  initialPart?: number;
}) {
  const tone = toneOf(guide.group);
  const ref = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(video.durationMs / 1000);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem(VOLUME_KEY));
      return Number.isFinite(v) && v >= 0 && v <= 1 && localStorage.getItem(VOLUME_KEY) !== null ? v : 1;
    } catch {
      return 1;
    }
  });
  const [speed, setSpeed] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem(SPEED_KEY));
      return SPEEDS.includes(v as (typeof SPEEDS)[number]) ? v : 1;
    } catch {
      return 1;
    }
  });
  const [subs, setSubs] = useState<string>(() => {
    try {
      return localStorage.getItem(SUBS_KEY) ?? 'bn';
    } catch {
      return 'bn';
    }
  });
  const [speedOpen, setSpeedOpen] = useState(false);

  const chapters = video.chapters;
  const lengths = useMemo(() => partLengths(chapters, video.durationMs), [chapters, video.durationMs]);
  const current = chapterAt(chapters, time * 1000);
  const langs = Object.keys(video.subtitles).filter((l) => l in LANG_NAMES);

  // Speed and subtitles follow the element, and are remembered for next time.
  useEffect(() => {
    const el = ref.current;
    if (el) el.playbackRate = speed;
    try {
      localStorage.setItem(SPEED_KEY, String(speed));
    } catch {
      /* a convenience only */
    }
  }, [speed, open]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    for (const t of Array.from(el.textTracks)) t.mode = t.language === subs ? 'showing' : 'hidden';
    try {
      localStorage.setItem(SUBS_KEY, subs);
    } catch {
      /* a convenience only */
    }
  }, [subs, open]);

  // Volume follows the element and is remembered.
  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.volume = volume;
      if (volume > 0 && el.muted) el.muted = false;
    }
    try {
      localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
      /* a convenience only */
    }
  }, [volume, open]);

  const seekTo = useCallback((ms: number) => {
    const el = ref.current;
    if (!el) return;
    el.currentTime = Math.max(0, ms / 1000);
    setTime(el.currentTime);
  }, []);
  const toPart = useCallback(
    (i: number) => {
      const c = chapters[Math.max(0, Math.min(chapters.length - 1, i))];
      if (!c) return;
      seekTo(c.startMs);
      void ref.current?.play().catch(() => undefined);
    },
    [chapters, seekTo],
  );
  const toggle = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  }, []);

  // Start on the part asked for; start playing once the metadata is in.
  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;
    const start = chapters[initialPart]?.startMs ?? 0;
    const onMeta = () => {
      setDuration(el.duration || video.durationMs / 1000);
      el.currentTime = start / 1000;
      el.playbackRate = speed;
      void el.play().catch(() => undefined);
    };
    if (el.readyState >= 1) onMeta();
    else el.addEventListener('loadedmetadata', onMeta, { once: true });
    return () => el.removeEventListener('loadedmetadata', onMeta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keyboard: space, arrows, brackets — only while nothing else has focus.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'ArrowRight') seekTo((time + 10) * 1000);
      else if (e.key === 'ArrowLeft') seekTo((time - 10) * 1000);
      else if (e.key === ']') toPart(current + 1);
      else if (e.key === '[') toPart(time * 1000 - chapters[current].startMs > 3000 ? current : current - 1);
      else if (e.key === 'f') void frameRef.current?.requestFullscreen?.();
      else if (e.key === 'm') {
        const el = ref.current;
        if (el) el.muted = !el.muted;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setVolume((v) => Math.min(1, Math.round((v + 0.1) * 10) / 10));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setVolume((v) => Math.max(0, Math.round((v - 0.1) * 10) / 10));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, toggle, seekTo, toPart, time, current, chapters]);

  const pct = duration ? Math.min(100, (time / duration) * 100) : 0;

  return (
    <Modal open={open} onClose={onClose} size="full" title={`${guide.kicker} · ${guide.title}`}>
      <div className="grid max-h-[calc(100vh-7rem)] gap-3 overflow-y-auto sm:gap-4 lg:max-h-none lg:grid-cols-[minmax(0,1fr)_19rem] lg:overflow-visible">
        {/* The screen */}
        <div
          ref={frameRef}
          className="group/player relative overflow-hidden rounded-2xl bg-black ring-1 ring-black/10"
          onDoubleClick={() => void frameRef.current?.requestFullscreen?.()}
        >
          <video
            ref={ref}
            src={resolveApiFileUrl(video.url)}
            poster={video.posterUrl ? resolveApiFileUrl(video.posterUrl) : undefined}
            crossOrigin="anonymous"
            preload="metadata"
            playsInline
            className="aspect-video max-h-[70vh] w-full bg-black object-contain"
            onClick={toggle}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onDurationChange={(e) => setDuration(e.currentTarget.duration || video.durationMs / 1000)}
            onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
          >
            {langs.map((l) => (
              <track
                key={l}
                kind="subtitles"
                srcLang={l}
                label={LANG_NAMES[l]}
                src={resolveApiFileUrl(video.subtitles[l])}
                default={l === subs}
              />
            ))}
          </video>

          {/* A big play button while paused, so the first click is obvious. */}
          {!playing && (
            <button
              type="button"
              onClick={toggle}
              aria-label="Play"
              className="absolute inset-x-0 top-0 flex aspect-video items-center justify-center bg-black/20 transition-colors hover:bg-black/30 sm:inset-0 sm:aspect-auto"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-xl transition-transform hover:scale-105">
                <Play className="ml-1 h-7 w-7 fill-current" />
              </span>
            </button>
          )}

          {/* The control bar */}
          {/* On a phone the bar sits under the picture; from sm up it floats over its foot. */}
          <div className="relative bg-slate-950 px-3 pb-2.5 pt-2 text-white sm:absolute sm:inset-x-0 sm:bottom-0 sm:bg-transparent sm:bg-gradient-to-t sm:from-black/80 sm:via-black/50 sm:to-transparent sm:pt-8">
            {/* Seek bar with a tick at each part */}
            <div
              className="group/seek relative h-6 cursor-pointer touch-none"
              role="slider"
              aria-label="Position"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(time)}
              tabIndex={0}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                seekTo(((e.clientX - r.left) / r.width) * duration * 1000);
              }}
            >
              <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/30 transition-[height] group-hover/seek:h-1.5">
                <div className="h-full rounded-full bg-brand-400" style={{ width: `${pct}%` }} />
              </div>
              {chapters.map((c) => (
                <span
                  key={c.n}
                  title={c.title}
                  className="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 bg-white/80"
                  style={{ left: `${duration ? (c.startMs / 1000 / duration) * 100 : 0}%` }}
                />
              ))}
              <span
                className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow opacity-0 transition-opacity group-hover/seek:opacity-100"
                style={{ left: `${pct}%` }}
              />
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 sm:gap-x-1.5">
              <Ctl onClick={() => toPart(time * 1000 - chapters[current].startMs > 3000 ? current : current - 1)} label="Previous part">
                <ChevronLeft className="h-5 w-5" />
              </Ctl>
              <Ctl onClick={toggle} label={playing ? 'Pause' : 'Play'}>
                {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
              </Ctl>
              <Ctl onClick={() => toPart(current + 1)} label="Next part" disabled={current >= chapters.length - 1}>
                <ChevronRight className="h-5 w-5" />
              </Ctl>
              <div className="group/vol flex items-center">
                <Ctl
                  onClick={() => {
                    const el = ref.current;
                    if (el) el.muted = !el.muted;
                  }}
                  label={muted ? 'Unmute' : 'Mute'}
                >
                  {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Ctl>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  aria-label="Volume"
                  className="h-1.5 w-0 cursor-pointer accent-brand-400 transition-[width] duration-200 group-hover/vol:w-20 group-focus-within/vol:w-20 sm:w-16 sm:group-hover/vol:w-24"
                />
              </div>
              <span className="ml-1 text-xs tabular-nums text-white/90">
                {clock(time * 1000)} <span className="text-white/50">/ {clock(duration * 1000)}</span>
              </span>
              <span className="ml-2 hidden truncate text-xs text-white/70 sm:inline">
                Part {chapters[current]?.n ?? current + 1} · {chapters[current]?.title}
              </span>

              <div className="ml-auto flex items-center gap-1">
                {/* Speed */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSpeedOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={speedOpen}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold tabular-nums hover:bg-white/20"
                  >
                    <Gauge className="h-3.5 w-3.5" />
                    {speedLabel(speed)}
                  </button>
                  {speedOpen && (
                    <div
                      role="menu"
                      className="absolute bottom-full right-0 mb-2 w-28 overflow-hidden rounded-xl bg-slate-900/95 p-1 text-xs shadow-xl ring-1 ring-white/10 backdrop-blur"
                    >
                      <p className="px-2 pb-1 pt-1.5 text-[0.625rem] font-semibold uppercase tracking-wider text-white/50">Speed</p>
                      {SPEEDS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          role="menuitemradio"
                          aria-checked={s === speed}
                          onClick={() => {
                            setSpeed(s);
                            setSpeedOpen(false);
                          }}
                          className={cn(
                            'flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-white/10',
                            s === speed && 'bg-brand-500/30 font-semibold',
                          )}
                        >
                          {speedLabel(s)}
                          {s === 1 && <span className="text-[0.625rem] text-white/50">normal</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Subtitles */}
                {langs.length > 0 && (
                  <label className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold hover:bg-white/20">
                    <Captions className="h-3.5 w-3.5" />
                    <select
                      value={subs}
                      onChange={(e) => setSubs(e.target.value)}
                      aria-label="Subtitles"
                      className="bg-transparent text-xs font-semibold text-white outline-none [&>option]:text-slate-900"
                    >
                      {langs.map((l) => (
                        <option key={l} value={l}>
                          {LANG_NAMES[l]}
                        </option>
                      ))}
                      <option value="off">Off</option>
                    </select>
                  </label>
                )}
                <Ctl onClick={() => void frameRef.current?.requestFullscreen?.()} label="Full screen">
                  <Maximize2 className="h-4 w-4" />
                </Ctl>
              </div>
            </div>
          </div>
        </div>

        {/* The parts */}
        <aside className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white lg:max-h-[70vh]">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-slate-400">Parts</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">
              {chapters.length} parts · {clock(video.durationMs)}
            </p>
          </div>
          <ol className="max-h-[40vh] flex-1 overflow-y-auto p-1.5 lg:max-h-none">
            {chapters.map((c, i) => {
              const on = i === current;
              const done = i < current;
              return (
                <li key={c.n}>
                  <button
                    type="button"
                    onClick={() => toPart(i)}
                    aria-current={on ? 'true' : undefined}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-slate-50',
                      on && 'bg-slate-50 ring-1 ring-inset ring-slate-200',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-bold tabular-nums ring-1 ring-inset',
                        on ? tone.badge : done ? 'bg-slate-100 text-slate-400 ring-slate-200' : 'bg-white text-slate-500 ring-slate-200',
                      )}
                    >
                      {on && playing ? <span className="h-2 w-2 animate-pulse rounded-full bg-current" /> : c.n}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-sm leading-snug', on ? 'font-semibold text-slate-900' : 'text-slate-700')}>
                        {c.title}
                      </span>
                      <span className="mt-0.5 block text-xs tabular-nums text-slate-400">
                        {clock(c.startMs)} · {clock(lengths[i])}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="hidden border-t border-slate-100 px-4 py-2 text-[0.6875rem] leading-relaxed text-slate-400 sm:block">
            Space plays and pauses · ← → ten seconds · ↑ ↓ volume · M mute · [ ] previous and next part · F full screen
          </p>
        </aside>
      </div>
    </Modal>
  );
}

function Ctl({
  children,
  onClick,
  label,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className="rounded-lg p-1.5 text-white/90 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40"
    >
      {children}
    </button>
  );
}
