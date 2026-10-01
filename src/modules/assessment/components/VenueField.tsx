import { useMemo } from 'react';
import { Building2, MapPin } from 'lucide-react';

import { Input } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { useMasterData } from '@modules/master-data';

import { VenuePicker } from './VenuePicker';
import { joinVenue, splitVenue } from './venue';

/**
 * Where an in-person interview happens, in two parts: the Location — one of
 * DBL's job locations, the same list as a requisition's place of posting —
 * and the room or building there. Stored as one string ("room, location"),
 * so everything that already prints a venue keeps working.
 */
export function VenueField({
  value,
  onChange,
  roomList,
  invalid,
  disabled,
  compact,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Offer DBL's meeting-room list for the room (corporate schedulers). */
  roomList?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  /** Stack the two parts, for narrow schedulers. */
  compact?: boolean;
}) {
  const { data: master } = useMasterData();
  const locations = useMemo(
    () => master?.jobLocations ?? [],
    [master?.jobLocations],
  );
  const { place, location } = splitVenue(value, locations);

  const select = (
    <div>
      <label className="mb-1 flex items-center gap-1 text-[0.6875rem] font-medium text-slate-400">
        <MapPin className="h-3 w-3" /> Location
      </label>
      <select
        value={location}
        disabled={disabled || locations.length === 0}
        onChange={(e) => onChange(joinVenue(place, e.target.value))}
        className={cn(
          'h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-brand-500/20',
          'border-slate-300 focus:border-brand-400',
          !location && 'text-slate-400',
        )}
      >
        <option value="">
          {locations.length ? 'Select a location…' : 'No locations configured'}
        </option>
        {locations.map((l) => (
          <option key={l} value={l} className="text-slate-800">
            {l}
          </option>
        ))}
      </select>
    </div>
  );

  const room = (
    <div>
      <label className="mb-1 flex items-center gap-1 text-[0.6875rem] font-medium text-slate-400">
        <Building2 className="h-3 w-3" /> Venue / room
      </label>
      {roomList ? (
        <VenuePicker
          value={place}
          invalid={invalid}
          disabled={disabled}
          onChange={(v) => onChange(joinVenue(v, location))}
        />
      ) : (
        <Input
          placeholder="e.g. HR Meeting Room, DBTex Building"
          value={place}
          disabled={disabled}
          onChange={(e) => onChange(joinVenue(e.target.value, location))}
          className={invalid ? 'border-rose-400 focus:ring-rose-400' : ''}
        />
      )}
    </div>
  );

  return (
    <div className={cn('grid gap-2', !compact && 'sm:grid-cols-2')}>
      {select}
      {room}
    </div>
  );
}
