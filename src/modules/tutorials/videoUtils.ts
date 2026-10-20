import type { TutorialVideoChapter } from './types/tutorials.types';

/** "4:05" or "1:02:30" — the clock a player shows. */
export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

/** The chapter playing at `ms`: the last one that has started (the first before any has). */
export function chapterAt(chapters: readonly TutorialVideoChapter[], ms: number): number {
  let i = 0;
  for (let k = 0; k < chapters.length; k++) if (chapters[k].startMs <= ms) i = k;
  return i;
}

/** How long each part runs: to the next part's start, the last to the end. */
export function partLengths(chapters: readonly TutorialVideoChapter[], durationMs: number): number[] {
  return chapters.map((c, i) => (i + 1 < chapters.length ? chapters[i + 1].startMs : durationMs) - c.startMs);
}

/** The playback speeds offered, in order. */
export const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

/** "1×", "1.25×". */
export function speedLabel(rate: number): string {
  return `${Number.isInteger(rate) ? rate : rate.toFixed(2).replace(/0+$/, '')}×`;
}
