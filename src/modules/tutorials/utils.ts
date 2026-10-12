import type { Tutorial } from './types/tutorials.types';

export const fileSize = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Roughly how long a read takes — two minutes a page, since these are dense
 * guides with figures, to the nearest five minutes (half hour past an hour).
 */
export function readingTime(pages: number): string {
  const minutes = Math.max(5, Math.round((pages * 2) / 5) * 5);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.round((minutes / 60) * 2) / 2} h`;
}

const wordsOf = (query: string) => query.trim().toLowerCase().split(/\s+/).filter(Boolean);

/** Every word typed appears in the text. */
function containsAll(text: string, words: string[]): boolean {
  const t = text.toLowerCase();
  return words.every((w) => t.includes(w));
}

/** Every word typed must appear somewhere in the guide's text or chapter titles. */
export function matchesQuery(guide: Tutorial, query: string): boolean {
  const words = wordsOf(query);
  if (!words.length) return true;
  return containsAll(
    [guide.title, guide.kicker, guide.subtitle, guide.audience, guide.group, ...guide.chapters.map((c) => c.title)].join(
      ' ',
    ),
    words,
  );
}

/** The chapters whose own title holds every word typed — what a search can jump straight to. */
export function matchingChapters(guide: Tutorial, query: string): Tutorial['chapters'] {
  const words = wordsOf(query);
  return words.length ? guide.chapters.filter((c) => containsAll(c.title, words)) : [];
}

/** A chapter opens the guide at its page — PDF viewers honour `#page=N`. */
export function atPage(url: string | undefined, page: number | null): string | undefined {
  return url && page ? `${url}#page=${page}` : url;
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
