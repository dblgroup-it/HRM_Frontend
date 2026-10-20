/** One guide in the Tutorials menu — a PDF of the client documentation. */
export interface Tutorial {
  slug: string;
  /** "00" … "12" — the order the guides are printed in. */
  number: string;
  title: string;
  kicker: string;
  subtitle: string;
  /** Who it is written for. */
  audience: string;
  /** The section it sits in: "Requisition", "Onboarding"… */
  group: string;
  /** The guide's section titles, for "Inside this guide". */
  contents: string[];
  /** The same sections with the page each starts on (null when unknown). */
  chapters: TutorialChapter[];
  pages: number;
  bytes: number;
  /** Signed, short-lived links; relative to the API. */
  url: string;
  downloadUrl: string;
  /** The cover as a small picture; null on an older build. */
  thumbUrl: string | null;
  /** The guide as a recorded video, cut into its chapters; null when none is published (or an older API). */
  video?: TutorialVideo | null;
}

/** A guide's video: a signed stream link, its parts, subtitles and poster. */
export interface TutorialVideo {
  url: string;
  /** The same video by height — the recorded "1080" and, where encoded, a lighter "720"; absent on an older API. */
  sources?: Partial<Record<'1080' | '720', string>>;
  durationMs: number;
  bytes: number;
  chapters: TutorialVideoChapter[];
  /** Language code → signed WebVTT link. */
  subtitles: Record<string, string>;
  posterUrl: string | null;
  /** ISO date it was published to the app; null on an older API. */
  publishedAt?: string | null;
}

export interface TutorialVideoChapter {
  n: number;
  title: string;
  startMs: number;
}

export interface TutorialChapter {
  title: string;
  page: number | null;
}

/** The video playlist on the Tutorials page — the same for everyone. */
export interface TutorialVideos {
  playlistId: string;
  title: string;
  channel: string | null;
  /** The playlist on YouTube. */
  url: string;
  /** YouTube's privacy-enhanced player for the playlist. */
  embedUrl: string;
}

/** The playlist as a super user sets it on Integrations; null id = off the page. */
export interface TutorialVideoSettings {
  playlistId: string | null;
  title: string;
  channel: string;
}

export interface TutorialsList {
  version: string | null;
  date: string | null;
  /** `roles`: the guides for this person's roles. `all`: an administrator, who sees every guide. */
  scope: 'all' | 'roles';
  /** The roles this person holds, for the header. */
  roles: { key: string; name: string }[];
  guides: Tutorial[];
  /** Null when no playlist is set (or an older API, which sends none). */
  videos?: TutorialVideos | null;
}
