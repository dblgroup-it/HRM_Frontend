/* Venue rules, split out of VenuePicker so the component file exports only a
   component (and Fast Refresh keeps working). */

import type { RecruitmentPerms } from '@modules/candidates';

/** "Head Office :: Room-301" — the way the rooms were given to us. */
export const roomLabel = (building: string, room: string) =>
  `${building} :: ${room}`;

/**
 * Should this scheduler offer DBL's room list rather than a free field?
 *
 * The question is who is booking, not where the vacancy is. Head of Talent
 * Acquisition and the Corporate Recruiter book DBL's own meeting rooms, and
 * picking from a maintained list keeps the venue recognisable to everyone
 * invited. Anyone else — a factory interviewer the candidate was delegated
 * to, most of all — interviews wherever they can arrange, so forcing them
 * into a list of corporate rooms would simply block them.
 *
 * Super users pass because they bypass every other gate in this system; a
 * gate they alone failed would read as a bug.
 */
export function usesRoomList(perms: RecruitmentPerms | undefined | null): boolean {
  if (!perms) return false;
  if (perms.isSuperUser) return true;
  return (perms.roles ?? []).some(
    (r) => r.key === 'corporate_hr' || r.key === 'corporate_recruiter',
  );
}
