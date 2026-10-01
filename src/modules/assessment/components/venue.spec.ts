import { describe, expect, it } from 'vitest';

import { joinVenue, splitVenue } from './venue';

const LOCATIONS = ['Kashimpur, Gazipur', 'Gulshan, Dhaka', 'Dhaka'];

describe('venue with a location', () => {
  it('joins the room and the location', () => {
    expect(joinVenue('HR Meeting Room', 'Kashimpur, Gazipur')).toBe(
      'HR Meeting Room, Kashimpur, Gazipur',
    );
    expect(joinVenue('', 'Dhaka')).toBe('Dhaka');
    expect(joinVenue('Room 3', '')).toBe('Room 3');
  });

  it('splits it back, preferring the longest location', () => {
    expect(splitVenue('Board Room, Gulshan, Dhaka', LOCATIONS)).toEqual({
      place: 'Board Room',
      location: 'Gulshan, Dhaka',
    });
    expect(splitVenue('Dhaka', LOCATIONS)).toEqual({ place: '', location: 'Dhaka' });
  });

  it('leaves a venue typed before locations existed untouched', () => {
    expect(splitVenue('HR Meeting Room, DBTex Building', LOCATIONS)).toEqual({
      place: 'HR Meeting Room, DBTex Building',
      location: '',
    });
  });

  it('survives typing, including a trailing comma', () => {
    const typed = joinVenue('Room 3, ', 'Dhaka');
    expect(splitVenue(typed, LOCATIONS)).toEqual({ place: 'Room 3, ', location: 'Dhaka' });
  });
});
