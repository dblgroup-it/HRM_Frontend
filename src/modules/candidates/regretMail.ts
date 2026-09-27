import { formatDate } from '@shared/utils';

/**
 * DBL's regret letter, as the candidate will read it.
 *
 * A preview only: the server sends its own copy
 * (`HRM_Backend/src/modules/candidates/regret-mail.ts`), so a bundle that
 * drifted from it could never change what goes out. Keep the two in step.
 */
export const REGRET_MAIL_PREVIEW = `Dear Applicant,

Greetings from DBL Group.

Thank you for your interest in DBL Group and for taking the time to participate in our selection process. We appreciate the opportunity to learn more about your experience and expertise.

After careful consideration of the requirements of the position and the candidates assessed, we regret to inform you that we have decided to proceed with another candidate whose profile more closely matches the current requirements of the role.

We appreciate your interest in DBL Group and will retain your CV in our database for consideration for future opportunities that may be relevant to your profile.

We wish you every success in your career and future endeavors.

Best Regards,
Corporate HR
DBL Group`;

/** The server's batch cap — each one is a real email sent while you wait. */
export const MAX_REGRET_PER_SEND = 100;

/** Everything the modal needs to know about a candidate. */
export interface RegretTarget {
  id: string;
  name: string;
  email: string | null;
  stage: string;
  regretSentAt: string | null;
}

/**
 * Why this candidate cannot be sent the letter, or null when they can.
 * Mirrors `regretMailBlocker` on the server, which has the final say.
 */
export function regretBlocker(c: RegretTarget): string | null {
  if (c.stage.toLowerCase() !== 'rejected') return 'Not rejected';
  if (!c.email?.trim()) return 'No email on file';
  if (c.regretSentAt) return `Sent ${formatDate(c.regretSentAt)}`;
  return null;
}
