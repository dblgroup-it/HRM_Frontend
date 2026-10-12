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
  pages: number;
  bytes: number;
  /** Written for one of the roles this person holds. */
  forYou: boolean;
  /** Signed, short-lived link that opens the PDF; relative to the API. */
  url: string;
  downloadUrl: string;
}

export interface TutorialsList {
  version: string | null;
  date: string | null;
  guides: Tutorial[];
}
