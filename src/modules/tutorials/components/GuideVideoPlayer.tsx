import {
  Captions,
  ChevronLeft,
  ChevronRight,
  Gauge,
  ListVideo,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { resolveApiFileUrl } from '@shared/api';
import { Modal } from '@shared/components/ui';
import { cn } from '@shared/lib';

import { toneOf } from '../tones';
import type { Tutorial, TutorialVideo } from '../types/tutorials.types';
import { SPEEDS, chapterAt, clock, partLengths, speedLabel } from '../videoUtils';

const SPEED_KEY = 'hrm.tutorials.videoSpeed';
const SUBS_KEY = 'hrm.tutorials.videoSubs';
const VOLUME_KEY = 'hrm.tutorials.videoVolume';
const LANG_NAMES: Record<string, string> = { bn: 'বাংলা', en: 'English' };
/** The controls fade this long after the pointer rests, while playing. */
const HIDE_AFTER_MS = 2600;

function remembered<T>(key: string, parse: (raw: string) => T | null, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const v = parse(raw);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
}
function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* a convenience only */
  }
}

/**
 * A guide's video, played part by part. The picture carries its own controls,
 * which fade while it plays and return on a touch of the pointer: a seek bar
 * drawn in segments, one per part; play, previous and next part; volume with
 * a slider; the clock and the part playing; speed, subtitles and full screen.
 * The parts list sits beside the picture — and in full screen slides in over
 * it from the Parts button, so a part is never more than a tap away.
 * Keys: space · ← → 10 s · ↑ ↓ volume · M · [ ] parts · F full screen.
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
  initialPart?: number;
}) {
  const tone = toneOf(guide.group);
  const ref = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(video.durationMs / 1000);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(() => remembered(VOLUME_KEY, (r) => (Number(r) >= 0 && Number(r) <= 1 ? Number(r) : null), 1));
  const [speed, setSpeed] = useState(() => remembered(SPEED_KEY, (r) => (SPEEDS.includes(Number(r) as never) ? Number(r) : null), 1));
  const [subs, setSubs] = useState(() => remembered(SUBS_KEY, (r) => r, 'bn'));
  const [speedOpen, setSpeedOpen] = useState(false);
  const [fs, setFs] = useState(false);
  const [partsOpen, setPartsOpen] = useState(false);
  const [idle, setIdle] = useState(false);

  const chapters = video.chapters;
  const lengths = useMemo(() => partLengths(chapters, video.durationMs), [chapters, video.durationMs]);
  const current = chapterAt(chapters, time * 1000);
  const langs = Object.keys(video.subtitles).filter((l) => l in LANG_NAMES);
  const total = duration * 1000 || video.durationMs;

  // Settings follow the element and are remembered.
  useEffect(() => {
    const el = ref.current;
    if (el) el.playbackRate = speed;
    remember(SPEED_KEY, String(speed));
  }, [speed, open]);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.volume = volume;
      if (volume > 0 && el.muted) el.muted = false;
    }
    remember(VOLUME_KEY, String(volume));
  }, [volume, open]);
  useEffect(() => {
    const el = ref.current;
    if (el) for (const t of Array.from(el.textTracks)) t.mode = t.language === subs ? 'showing' : 'hidden';
    remember(SUBS_KEY, subs);
  }, [subs, open]);

  const seekTo = useCallback((ms: number) => {
    const el = ref.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(el.duration || Infinity, ms / 1000));
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
  const prevPart = useCallback(
    () => toPart(time * 1000 - (chapters[current]?.startMs ?? 0) > 3000 ? current : current - 1),
    [toPart, time, current, chapters],
  );
  const toggle = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  }, []);
  const toggleMute = useCallback(() => {
    const el = ref.current;
    if (el) el.muted = !el.muted;
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
    else void frameRef.current?.requestFullscreen?.().catch(() => undefined);
  }, []);

  // Full-screen state follows the browser, whichever way it was entered or left.
  useEffect(() => {
    const onChange = () => {
      const on = document.fullscreenElement === frameRef.current;
      setFs(on);
      if (!on) setPartsOpen(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // The controls rest while the video plays and the pointer is still.
  const wake = useCallback(() => {
    setIdle(false);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setIdle(true), HIDE_AFTER_MS);
  }, []);
  useEffect(() => {
    if (!playing || speedOpen || partsOpen) {
      setIdle(false);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      return;
    }
    wake();
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [playing, speedOpen, partsOpen, wake]);

  // Start on the part asked for, once the metadata is in.
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

  // Keyboard, while nothing else has focus.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      wake();
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'ArrowRight') seekTo((time + 10) * 1000);
      else if (e.key === 'ArrowLeft') seekTo((time - 10) * 1000);
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setVolume((v) => Math.min(1, Math.round((v + 0.1) * 10) / 10));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setVolume((v) => Math.max(0, Math.round((v - 0.1) * 10) / 10));
      } else if (e.key === ']') toPart(current + 1);
      else if (e.key === '[') prevPart();
      else if (e.key === 'f') toggleFullscreen();
      else if (e.key === 'm') toggleMute();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, toggle, seekTo, toPart, prevPart, toggleFullscreen, toggleMute, wake, time, current]);

  const onClose_ = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
    onClose();
  }, [onClose]);

  const controlsHidden = idle && playing;

  const parts = (
    <ol className="p-1.5">
      {chapters.map((c, i) => {
        const on = i === current;
        const done = i < current;
        return (
          <li key={c.n}>
            <button
              type="button"
              onClick={() => {
                toPart(i);
                if (fs) setPartsOpen(false);
              }}
              aria-current={on ? 'true' : undefined}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left transition-colors',
                fs ? 'hover:bg-white/10' : 'hover:bg-slate-50',
                on && (fs ? 'bg-white/10' : 'bg-slate-50 ring-1 ring-inset ring-slate-200'),
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-bold tabular-nums ring-1 ring-inset',
                  on
                    ? tone.badge
                    : fs
                      ? 'bg-white/5 text-white/60 ring-white/15'
                      : done
                        ? 'bg-slate-100 text-slate-400 ring-slate-200'
                        : 'bg-white text-slate-500 ring-slate-200',
                )}
              >
                {on && playing ? <span className="h-2 w-2 animate-pulse rounded-full bg-current" /> : c.n}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-sm leading-snug',
                    on ? 'font-semibold' : '',
                    fs ? (on ? 'text-white' : 'text-white/80') : on ? 'text-slate-900' : 'text-slate-700',
                  )}
                >
                  {c.title}
                </span>
                <span className={cn('mt-0.5 block text-xs tabular-nums', fs ? 'text-white/45' : 'text-slate-400')}>
                  {clock(c.startMs)} · {clock(lengths[i])}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );

  return (
    <Modal open={open} onClose={onClose_} size="full" title={`${guide.kicker} · ${guide.title}`}>
      <div className="grid max-h-[calc(100vh-7rem)] gap-3 overflow-y-auto sm:gap-4 lg:max-h-none lg:grid-cols-[minmax(0,1fr)_19rem] lg:overflow-visible">
        {/* ─── The picture ─── */}
        <div
          ref={frameRef}
          className={cn(
            'group/player relative overflow-hidden bg-black ring-1 ring-black/10',
            fs ? 'flex h-full w-full items-center justify-center rounded-none' : 'rounded-2xl',
            controlsHidden && 'cursor-none',
          )}
          onMouseMove={wake}
          onTouchStart={wake}
          onDoubleClick={toggleFullscreen}
        >
          <video
            ref={ref}
            src={resolveApiFileUrl(video.url)}
            poster={video.posterUrl ? resolveApiFileUrl(video.posterUrl) : undefined}
            crossOrigin="anonymous"
            preload="metadata"
            playsInline
            className={cn('w-full bg-black object-contain', fs ? 'h-full max-h-full' : 'aspect-video max-h-[70vh]')}
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

          {/* A quiet play mark while paused */}
          {!playing && (
            <button
              type="button"
              onClick={toggle}
              aria-label="Play"
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-2xl ring-1 ring-black/5 transition-transform hover:scale-105 sm:h-[4.5rem] sm:w-[4.5rem]">
                <Play className="ml-1 h-7 w-7 fill-current" />
              </span>
            </button>
          )}

          {/* ─── The controls ─── */}
          <div
            className={cn(
              'inset-x-0 bottom-0 z-10 text-white transition-opacity duration-300',
              // on a phone the bar sits under the picture; from sm up (and in full screen) it floats over its foot
              fs
                ? 'absolute bg-gradient-to-t from-black/85 via-black/50 to-transparent px-4 pb-3 pt-14 sm:px-6'
                : 'relative bg-slate-950 px-3 pb-2.5 pt-2 sm:absolute sm:bg-transparent sm:bg-gradient-to-t sm:from-black/85 sm:via-black/50 sm:to-transparent sm:px-4 sm:pt-12',
              controlsHidden && 'pointer-events-none opacity-0',
            )}
          >
            {/* Seek bar in segments, one per part */}
            <div
              className="group/seek relative flex h-6 cursor-pointer touch-none items-center gap-[3px]"
              role="slider"
              aria-label="Position"
              aria-valuemin={0}
              aria-valuemax={Math.round(total / 1000)}
              aria-valuenow={Math.round(time)}
              tabIndex={0}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                seekTo(((e.clientX - r.left) / r.width) * total);
              }}
            >
              {chapters.map((c, i) => {
                const len = lengths[i] || 1;
                const filled = Math.max(0, Math.min(1, (time * 1000 - c.startMs) / len));
                return (
                  <span
                    key={c.n}
                    title={`${c.n}. ${c.title}`}
                    className="relative h-1 flex-none overflow-hidden rounded-full bg-white/30 transition-[height] group-hover/seek:h-1.5"
                    style={{ width: `${(len / total) * 100}%` }}
                  >
                    <span className="absolute inset-y-0 left-0 bg-brand-400" style={{ width: `${filled * 100}%` }} />
                  </span>
                );
              })}
              <span
                className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow opacity-0 transition-opacity group-hover/seek:opacity-100"
                style={{ left: `${(time * 1000 / total) * 100}%` }}
              />
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 sm:gap-x-1.5">
              <Ctl onClick={prevPart} label="Previous part">
                <ChevronLeft className="h-5 w-5" />
              </Ctl>
              <Ctl onClick={toggle} label={playing ? 'Pause' : 'Play'} big>
                {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
              </Ctl>
              <Ctl onClick={() => toPart(current + 1)} label="Next part" disabled={current >= chapters.length - 1}>
                <ChevronRight className="h-5 w-5" />
              </Ctl>
              <div className="group/vol ml-0.5 flex items-center">
                <Ctl onClick={toggleMute} label={muted ? 'Unmute' : 'Mute'}>
                  {muted || volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Ctl>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  aria-label="Volume"
                  className="ml-1 h-1 w-14 cursor-pointer accent-white sm:w-20"
                />
              </div>
              <span className="ml-1.5 text-xs tabular-nums text-white/90 sm:text-[0.8125rem]">
                {clock(time * 1000)} <span className="text-white/50">/ {clock(total)}</span>
              </span>
              <span className="ml-3 hidden min-w-0 truncate text-[0.8125rem] text-white/80 md:inline">
                <span className="font-semibold text-white">Part {chapters[current]?.n ?? current + 1}</span>
                <span className="text-white/40"> of {chapters.length} · </span>
                {chapters[current]?.title}
              </span>

              <div className="ml-auto flex items-center gap-1">
                {/* Speed */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSpeedOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={speedOpen}
                    className={cn(
                      'inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold tabular-nums transition-colors hover:bg-white/15',
                      speedOpen && 'bg-white/15',
                    )}
                  >
                    <Gauge className="h-4 w-4" />
                    {speedLabel(speed)}
                  </button>
                  {speedOpen && (
                    <div
                      role="menu"
                      className="absolute bottom-full right-0 mb-2 w-32 overflow-hidden rounded-xl bg-slate-900/95 p-1 text-xs shadow-xl ring-1 ring-white/10 backdrop-blur"
                    >
                      <p className="px-2 pb-1 pt-1.5 text-[0.625rem] font-semibold uppercase tracking-wider text-white/50">Playback speed</p>
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
                  <label
                    className={cn(
                      'inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold transition-colors hover:bg-white/15',
                      subs !== 'off' && 'text-brand-300',
                    )}
                  >
                    <Captions className="h-4 w-4" />
                    <select
                      value={subs}
                      onChange={(e) => setSubs(e.target.value)}
                      aria-label="Subtitles"
                      className="bg-transparent text-xs font-semibold outline-none [&>option]:text-slate-900"
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
                {fs && (
                  <Ctl onClick={() => setPartsOpen((v) => !v)} label="Parts">
                    <ListVideo className="h-5 w-5" />
                  </Ctl>
                )}
                <Ctl onClick={toggleFullscreen} label={fs ? 'Exit full screen' : 'Full screen'}>
                  {fs ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                </Ctl>
              </div>
            </div>
          </div>

          {/* In full screen the parts slide in over the picture */}
          {fs && (
            <aside
              className={cn(
                'absolute inset-y-0 right-0 z-20 flex w-80 max-w-[85vw] flex-col bg-slate-950/90 text-white backdrop-blur transition-transform duration-300',
                partsOpen ? 'translate-x-0' : 'translate-x-full',
              )}
              aria-hidden={!partsOpen}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-white/50">Parts</p>
                  <p className="text-sm font-semibold">
                    {chapters.length} parts · {clock(video.durationMs)}
                  </p>
                </div>
                <button type="button" onClick={() => setPartsOpen(false)} aria-label="Close parts" className="rounded-lg p-1.5 hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{parts}</div>
            </aside>
          )}
        </div>

        {/* ─── The parts beside the picture ─── */}
        <aside className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white lg:max-h-[70vh]">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-slate-400">Parts</p>
            <div className="mt-0.5 flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">
                {chapters.length} parts · {clock(video.durationMs)}
              </p>
              <p className="text-xs tabular-nums text-slate-400">
                {Math.round((Math.min(time * 1000, total) / total) * 100)}% watched
              </p>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
              <div className={cn('h-full rounded-full', tone.dot)} style={{ width: `${(Math.min(time * 1000, total) / total) * 100}%` }} />
            </div>
          </div>
          <div className="max-h-[40vh] flex-1 overflow-y-auto lg:max-h-none">{parts}</div>
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
  big,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  big?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center rounded-lg text-white/90 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40',
        big ? 'h-9 w-9' : 'h-8 w-8',
      )}
    >
      {children}
    </button>
  );
}
