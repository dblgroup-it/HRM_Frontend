import type { ElementType, ReactNode } from 'react';
import {
  CalendarClock,
  UserRound,
  ExternalLink,
  FileText,
  MapPin,
  Video,
} from 'lucide-react';

import { cn } from '@shared/lib';
import { resolveApiFileUrl } from '@shared/api';

import type { CandidateBrief } from '../types/assessment.types';

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}


export interface CandidateRailProps {
  name: string;
  designation: string;
  unit?: string | null;
  /** 'first' / 'second' / … — printed as "First interview". */
  kind: string;
  mode: string;
  scheduledAt: string | null;
  location?: string | null;
  /** "Marking as …" — the emailed page names the panelist; in-app it is you. */
  markerName?: string;
  cvUrl: string | null;
  brief: CandidateBrief | null | undefined;
  /**
   * Where the rail pins from `lg` up — below whatever header the page has.
   * The emailed page's header is 4.25rem; the app's is taller.
   */
  stickyClassName?: string;
}

/**
 * Who you are marking, laid out as DBL's shortlisting sheet lays them out.
 *
 * The same five boxes the paper sheet has — Name & Mobile No., Age,
 * Educational Status, Positions Worked & Companies, Total Service — so a
 * panelist reads the candidate in the shape they already know. Posts are
 * grouped under their company with the years at each ("SQ Group : 7.1 Yrs.
 * Total") and every post carries its own dates and span, because "relevant
 * experience" is scored on exactly those figures.
 *
 * Beside the marking sheet on a laptop, 40% of the width (the rail scrolls inside itself, since
 * height is what a laptop is short of). On a tablet, above the sheet, it runs
 * across as the sheet's row of columns; on a phone it stacks.
 */
export function CandidateRail({
  name,
  designation,
  unit,
  kind,
  mode,
  scheduledAt,
  location,
  markerName,
  cvUrl,
  brief,
  stickyClassName = 'lg:top-[4.25rem]',
}: CandidateRailProps) {
  const degrees = brief?.education?.filter((e) => e.kind !== 'certification') ?? [];
  const certs = brief?.education?.filter((e) => e.kind === 'certification') ?? [];
  // Older API builds send only the flat list; group it here so the layout
  // does not depend on which server answered.
  const companies =
    brief?.companies ??
    (brief?.employment ?? []).map((j) => ({ company: j.company, total: j.duration, roles: [j] }));
  const hasBrief = Boolean(brief && !brief.empty);

  // A course's "institute" is often its own name again; print it once.
  const eduLine = (e: CandidateBrief['education'][number]) =>
    [e.degree, e.institute && e.institute.toLowerCase() !== e.degree.toLowerCase() ? e.institute : null]
      .filter(Boolean)
      .join(' - ') +
    (e.year ? ` (${e.year})` : '') +
    (e.result ? `, ${e.result}` : '');

  return (
    <div className={cn('lg:sticky lg:z-20', stickyClassName)}>
      <div className="animate-card-in overflow-hidden rounded-2xl border border-slate-300 bg-white lg:shadow-sm lg:shadow-slate-900/5">
        <div className="lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto">
          {/* The interview itself: the post being filled as the title, then
              when, where and who is marking as three labelled tiles, so each
              fact reads on its own instead of as one run-on line of text. */}
          <div className="border-b border-slate-200 bg-gradient-to-br from-brand-50/80 via-white to-white px-4 pb-3.5 pt-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.625rem] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Interviewing for
                </p>
                <p className="mt-0.5 text-base font-semibold leading-snug text-slate-900">
                  {designation}
                </p>
                {unit && <p className="text-xs leading-snug text-slate-500">{unit}</p>}
              </div>
              <span className="shrink-0 rounded-full bg-brand-600 px-2.5 py-1 text-[0.6875rem] font-semibold text-white shadow-sm shadow-brand-600/20">
                {cap(kind)} interview
              </span>
            </div>

            <div
              className={cn(
                'mt-3 grid gap-2',
                markerName ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
              )}
            >
              <MetaTile icon={CalendarClock} tone="text-brand-500" label="When">
                {scheduledAt ? (
                  <>
                    {fmtDay(scheduledAt)}
                    <span className="block text-xs font-normal text-slate-500">
                      {fmtTime(scheduledAt)}
                    </span>
                  </>
                ) : (
                  'Time to be set'
                )}
              </MetaTile>
              {mode === 'online' ? (
                <MetaTile icon={Video} tone="text-emerald-500" label="Where">
                  <span className="text-emerald-700">Online</span>
                </MetaTile>
              ) : (
                <MetaTile icon={MapPin} tone="text-rose-400" label="Where">
                  <span className="line-clamp-2" title={location ?? undefined}>
                    {location || 'Venue to be set'}
                  </span>
                </MetaTile>
              )}
              {markerName && (
                <MetaTile icon={UserRound} tone="text-slate-400" label="Marking as">
                  <span className="line-clamp-2">{markerName}</span>
                </MetaTile>
              )}
            </div>
          </div>

          {/* The sheet's row: stacked in the rail, across on a tablet. */}
          <div className="-mb-px -mr-px grid grid-cols-2 md:grid-cols-[minmax(0,1.25fr)_4.5rem_minmax(0,1.8fr)_minmax(0,2.2fr)_6rem] lg:grid-cols-[minmax(0,1fr)_4.5rem_6.5rem]">
            <Box
              title="Name & Mobile No."
              className="col-span-2 md:col-span-1 lg:col-span-1"
            >
              <p className="text-sm font-bold uppercase leading-snug text-slate-900">{name}</p>
              {brief?.address && (
                <p className="mt-1.5 text-xs leading-snug text-slate-700">{brief.address}</p>
              )}
              {brief?.phone && (
                <p className="mt-1.5 text-xs font-semibold tabular-nums text-slate-800">{brief.phone}</p>
              )}
              {brief?.email && (
                <p className="break-all text-xs font-semibold text-slate-800">{brief.email}</p>
              )}
            </Box>

            <Box title="Age" center className="md:order-none">
              <p className="text-lg font-bold tabular-nums text-slate-900">
                {brief?.age != null ? brief.age : <Dash />}
              </p>
            </Box>

            <Box title="Total Service" center className="md:order-last lg:order-none">
              <p className="text-lg font-bold leading-tight text-slate-900">
                {brief?.totalService ? shortService(brief.totalService) : <Dash />}
              </p>
              {brief?.totalService && shortService(brief.totalService) !== brief.totalService && (
                <p className="mt-0.5 text-[0.625rem] text-slate-500">{brief.totalService}</p>
              )}
            </Box>

            <Box title="Educational Status" className="col-span-2 md:col-span-1 lg:col-span-3">
              {degrees.length === 0 && certs.length === 0 ? (
                <Dash />
              ) : (
                <div className="space-y-2.5">
                  {degrees.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-900">Education:</p>
                      {degrees.map((e, i) => (
                        <p key={i} className="text-xs leading-snug text-slate-700">{eduLine(e)}</p>
                      ))}
                    </div>
                  )}
                  {certs.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-900">Professional Certifications:</p>
                      {certs.map((e, i) => (
                        <p key={i} className="text-xs leading-snug text-slate-700">{eduLine(e)}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Box>

            <Box title="Positions Worked & Companies" className="col-span-2 md:col-span-1 lg:col-span-3">
              {companies.length === 0 ? (
                <Dash />
              ) : (
                <div className="space-y-2.5">
                  {companies.map((c, i) => (
                    <div key={i}>
                      <p className="text-xs font-bold leading-snug text-slate-900">
                        {c.company}
                        {c.total && (
                          <span className="whitespace-nowrap">
                            {' '}: ({c.total}
                            {c.roles.length > 1 ? ' Total' : ''})
                          </span>
                        )}
                      </p>
                      {c.roles.map((r, j) => (
                        <p key={j} className="text-xs leading-snug text-slate-700">
                          {r.designation ?? 'Position not stated'}
                          {r.period && <span className="text-slate-500"> ({r.period.replace('–', '-')})</span>}
                          {c.roles.length > 1 && r.duration && (
                            <span className="text-slate-500"> ({r.duration})</span>
                          )}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </Box>
          </div>

          {!hasBrief && (
            <p className="border-t border-amber-100 bg-amber-50 px-4 py-2.5 text-xs leading-snug text-amber-800">
              This CV has not been read yet, so education and experience are
              not filled in. It is being read now; reopen this page in a
              minute, or open the full CV.
            </p>
          )}

          {cvUrl && (
            <div className="border-t border-slate-200 p-3">
              <a
                href={resolveApiFileUrl(cvUrl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-brand-600/25 transition-all hover:bg-brand-700 active:scale-[0.98]"
              >
                <FileText className="h-4 w-4 shrink-0" />
                Full CV
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/80" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * "22 years" → "22 Yrs", "2 years 8 months" → "2.7 Yrs" — the sheet's last
 * column. Whole years alone would print 2 years 11 months as "2 Yrs".
 */
function shortService(label: string): string {
  const t = label.trim();
  const y = /(\d+)\s*years?/i.exec(t);
  const m = /(\d+)\s*months?/i.exec(t);
  if (!y && !m) return label;
  const years = Number(y?.[1] ?? 0);
  const months = Number(m?.[1] ?? 0);
  if (!years) return `${months} Mo${months === 1 ? '' : 's'}`;
  return months ? `${(years + months / 12).toFixed(1)} Yrs` : `${years} Yrs`;
}

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** One fact of the interview: a small label over its value. */
function MetaTile({
  icon: Icon,
  tone,
  label,
  children,
}: {
  icon: ElementType;
  tone: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-2.5 py-2">
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone)} />
      <div className="min-w-0">
        <p className="text-[0.625rem] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <div className="text-[0.8125rem] font-semibold leading-snug text-slate-800">{children}</div>
      </div>
    </div>
  );
}

function Dash() {
  return <span className="text-sm text-slate-400">—</span>;
}

/** One box of the sheet: a grey header cell over its content. */
function Box({
  title,
  children,
  center,
  className,
}: {
  title: string;
  children: ReactNode;
  center?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col border-b border-r border-slate-200 last:border-b-0',
        className,
      )}
    >
      <p
        className={cn(
          'border-b border-slate-200 bg-slate-100/80 px-3 py-1.5 text-[0.6875rem] font-bold text-slate-800',
          center && 'text-center',
        )}
      >
        {title}
      </p>
      <div
        className={cn(
          'flex-1 px-3 py-2.5',
          center && 'flex flex-col items-center justify-center text-center',
        )}
      >
        {children}
      </div>
    </div>
  );
}
