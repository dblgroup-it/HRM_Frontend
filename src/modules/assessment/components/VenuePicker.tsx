import { useMemo } from 'react';

import { Input } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { useMasterData } from '@modules/master-data';

import { roomLabel } from './venue';

/**
 * Where the interview happens.
 *
 * A select rather than a combobox: the point of the list is that the room is
 * one of DBL's, bookable and known to whoever has to find it. "Somewhere
 * else" is kept as an explicit escape so an off-site interview is still
 * possible — and visibly a deliberate choice.
 */
export function VenuePicker({
  value,
  onChange,
  invalid,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const { data: master } = useMasterData();
  // Memoised on the fetched value, not on a fresh `?? {}` each render.
  const rooms = useMemo(() => master?.meetingRooms ?? {}, [master?.meetingRooms]);

  const known = useMemo(
    () =>
      new Set(
        Object.entries(rooms).flatMap(([building, list]) =>
          list.map((room) => roomLabel(building, room)),
        ),
      ),
    [rooms],
  );
  // A venue typed before the list existed, or chosen as "somewhere else",
  // must not silently reset the field to blank when the modal reopens.
  const isOther = Boolean(value) && !known.has(value);

  // No rooms to offer — the list has not loaded, the fetch failed, or none are
  // configured. A dropdown whose only real choice is "Somewhere else" is worse
  // than the plain field it replaced, so fall back to that instead.
  if (!known.size) {
    return (
      <Input
        placeholder="Venue — e.g. HQ Conference Room, Factory Training Hall"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={invalid ? 'border-rose-400 focus:ring-rose-400' : ''}
      />
    );
  }

  return (
    <div className="space-y-2">
      <select
        value={isOther ? '__other' : value}
        disabled={disabled}
        onChange={(e) =>
          onChange(e.target.value === '__other' ? '' : e.target.value)
        }
        className={cn(
          'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-brand-500/20',
          invalid
            ? 'border-rose-400 focus:border-rose-400'
            : 'border-slate-200 focus:border-brand-400',
        )}
      >
        <option value="">Select a meeting room…</option>
        {Object.entries(rooms).map(([building, list]) => (
          <optgroup key={building} label={building}>
            {list.map((room) => (
              <option key={room} value={roomLabel(building, room)}>
                {room}
              </option>
            ))}
          </optgroup>
        ))}
        <option value="__other">Somewhere else…</option>
      </select>

      {isOther && (
        <Input
          autoFocus
          placeholder="Where is it — e.g. client office, Gulshan"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
