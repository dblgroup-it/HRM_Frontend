import type { ReactNode } from 'react';
import { ArrowLeftRight, Building2, Users, X } from 'lucide-react';

import { Avatar } from '@shared/components/ui';
import { cn } from '@shared/lib';

import type { PanelEntry } from './panelEntry';


/**
 * Who interviews, in two groups: from HR, and from the other departments.
 *
 * The split is made here, by whoever arranges the round, rather than guessed
 * from anybody's job title: a department name in the directory says where a
 * person works, not what they are on this panel for. Only the HR group gets
 * the facilities section of the evaluation form.
 *
 * `renderPicker` is each screen's own directory search; it is handed the
 * group it adds to.
 */
export function PanelGroups({
  panel,
  committee,
  onAdd,
  onRemove,
  onMove,
  renderPicker,
}: {
  panel: PanelEntry[];
  committee: { userId: string; name: string }[];
  onAdd: (userId: string, name: string, hr: boolean) => void;
  onRemove: (userId: string) => void;
  onMove: (userId: string, hr: boolean) => void;
  renderPicker: (hr: boolean, onAdded: (userId: string, name: string) => void) => ReactNode;
}) {
  const inPanel = (userId: string) => panel.some((p) => p.userId === userId);
  const spare = committee.filter((m) => !inPanel(m.userId));

  const group = (hr: boolean) => {
    const members = panel.filter((p) => p.hr === hr);
    return (
      <div
        className={cn(
          'rounded-xl border p-2.5',
          hr ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/40',
        )}
      >
        <p
          className={cn(
            'mb-2 flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wide',
            hr ? 'text-emerald-700' : 'text-slate-600',
          )}
        >
          {hr ? <Building2 className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
          {hr ? 'From HR Department' : 'From other departments'}
          <span className="font-semibold normal-case tracking-normal text-slate-400">
            {hr ? '· also records facilities' : '· marks only'}
          </span>
        </p>

        {members.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {members.map((p) => (
              <span
                key={p.userId}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full py-1 pl-1 pr-1.5 text-xs font-medium text-white',
                  hr ? 'bg-emerald-600' : 'bg-brand-600',
                )}
              >
                <Avatar name={p.name} size="sm" />
                {p.name}
                <button
                  type="button"
                  onClick={() => onMove(p.userId, !hr)}
                  title={hr ? 'Move to other departments' : 'Move to HR Department'}
                  aria-label={hr ? `Move ${p.name} to other departments` : `Move ${p.name} to HR Department`}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-white/20"
                >
                  <ArrowLeftRight className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(p.userId)}
                  aria-label={`Remove ${p.name}`}
                  className="rounded-full p-0.5 hover:bg-white/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {spare.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[0.625rem] font-medium uppercase tracking-wide text-slate-400">
              Committee:
            </span>
            {spare.map((m) => (
              <button
                key={m.userId}
                type="button"
                onClick={() => onAdd(m.userId, m.name, hr)}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
              >
                + {m.name}
              </button>
            ))}
          </div>
        )}

        {renderPicker(hr, (userId, name) => onAdd(userId, name, hr))}
      </div>
    );
  };

  return (
    <div className="space-y-2.5">
      {group(true)}
      {group(false)}
    </div>
  );
}

/**
 * "From HR / From other departments" for one person being added to a round
 * that is already arranged. `onMouseDown` keeps focus in the search box, which
 * closes itself on blur when empty.
 */
export function PanelSideToggle({
  hr,
  onChange,
}: {
  hr: boolean;
  onChange: (hr: boolean) => void;
}) {
  const opt = (value: boolean, label: string) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onChange(value)}
      aria-pressed={hr === value}
      className={cn(
        'rounded-full px-2 py-0.5 text-[0.625rem] font-semibold transition-colors',
        hr === value
          ? value
            ? 'bg-emerald-600 text-white'
            : 'bg-brand-600 text-white'
          : 'text-slate-500 hover:bg-slate-100',
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="mb-1.5 inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-white p-0.5">
      {opt(true, 'From HR Department')}
      {opt(false, 'Other department')}
    </div>
  );
}
