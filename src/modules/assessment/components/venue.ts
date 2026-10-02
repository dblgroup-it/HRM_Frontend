/* Venue rules, split out of VenuePicker so the component file exports only a
   component (and Fast Refresh keeps working). */

import type { RecruitmentPerms } from '@modules/candidates';
import { groupLocation } from '@shared/utils';

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

/**
 * The venue as stored: "room or building, DBL Group, location" — one string,
 * so the emails, round cards and calendar invites need nothing new. The
 * location is one of DBL's job locations (the place-of-posting list), always
 * named under the group.
 */
export function joinVenue(place: string, location: string): string {
  const where = groupLocation(location);
  if (place && where) return `${place}, ${where}`;
  return place || where;
}

/**
 * The inverse of `joinVenue`, given the list the location came from. Reads
 * venues saved before the group was added ("room, location") as well.
 */
export function splitVenue(
  value: string,
  locations: string[],
): { place: string; location: string } {
  // Longest first, so "Dhaka" never wins over "Gulshan, Dhaka".
  const byLength = [...locations].sort((a, b) => b.length - a.length);
  for (const loc of byLength) {
    for (const whole of [groupLocation(loc), loc]) {
      if (value === whole) return { place: '', location: loc };
      const tail = `, ${whole}`;
      if (value.endsWith(tail)) {
        return { place: value.slice(0, -tail.length), location: loc };
      }
    }
  }
  return { place: value, location: '' };
}
