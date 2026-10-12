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

export interface TutorialsList {
  version: string | null;
  date: string | null;
  /** `roles`: the guides for this person's roles. `all`: an administrator, who sees every guide. */
  scope: 'all' | 'roles';
  /** The roles this person holds, for the header. */
  roles: { key: string; name: string }[];
  guides: Tutorial[];
}
