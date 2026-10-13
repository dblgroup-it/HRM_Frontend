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
