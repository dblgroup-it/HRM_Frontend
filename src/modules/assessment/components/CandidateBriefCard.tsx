import {
  Briefcase,
  Building2,
  CalendarRange,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from 'lucide-react';

import { cn } from '@shared/lib';

import type { CandidateBrief } from '../types/assessment.types';

/**
 * The candidate, as the shortlisting sheet writes them.
 *
 * Same five columns DBL prints on paper — who they are and how to reach them,
 * age, educational status, every post held with its company and span, and the
 * total service — stacked for a screen. An interviewer scoring "relevant
 * experience" is scoring exactly this, and until now their only source was a
 * PDF in another tab that nobody opens between two interviews.
 *
 * Renders nothing when the CV carried none of it: an empty scaffold of
 * headings says "we know nothing about this person" far less clearly than the
 * CV link that sits above it.
 */
export function CandidateBriefCard({
  brief,
  className,
}: {
  brief: CandidateBrief | undefined | null;
  className?: string;
}) {
  if (!brief || brief.empty) return null;

  const contact = [
    brief.phone ? { icon: Phone, text: brief.phone } : null,
    brief.email ? { icon: Mail, text: brief.email } : null,
    brief.address ? { icon: MapPin, text: brief.address } : null,
  ].filter(Boolean) as { icon: typeof Phone; text: string }[];

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60',
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
        <UserRound className="h-4 w-4 text-slate-400" />
        <p className="text-sm font-semibold text-slate-700">Candidate summary</p>
        <span className="ml-auto text-[0.625rem] uppercase tracking-wide text-slate-400">
          From their CV
        </span>
      </div>

      {/* Age and total service — the two numbers the sheet puts in their own
          columns, because they are what gets compared across a shortlist. */}
      {(brief.age !== null || brief.totalService) && (
        <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
          <Figure label="Age" value={brief.age ? `${brief.age} yrs` : '—'} />
          <Figure label="Total service" value={brief.totalService ?? '—'} />
        </div>
      )}

      <div className="space-y-4 px-5 py-4">
        {contact.length > 0 && (
          <ul className="space-y-1.5">
            {contact.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-start gap-2 text-xs text-slate-600"
              >
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="min-w-0 break-words">{text}</span>
              </li>
            ))}
          </ul>
        )}

        {brief.education.length > 0 && (
          <Section icon={GraduationCap} title="Educational status">
            <ul className="space-y-2">
              {brief.education.map((e, i) => (
                <li key={`${e.degree}-${i}`} className="text-xs leading-relaxed">
                  <p className="font-semibold text-slate-800">{e.degree}</p>
                  <p className="text-slate-500">
                    {[
                      e.institute,
                      e.year ? `(${e.year})` : null,
                      e.result,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {brief.employment.length > 0 && (
          <Section icon={Briefcase} title="Positions worked & companies">
            <ul className="space-y-2.5">
              {brief.employment.map((j, i) => (
                <li
                  key={`${j.company}-${i}`}
                  className="border-l-2 border-slate-100 pl-3 text-xs leading-relaxed"
                >
                  <p className="flex flex-wrap items-center gap-x-1.5 font-semibold text-slate-800">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                    {j.company}
                    {j.duration && (
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.625rem] font-semibold text-slate-500">
                        {j.duration}
                      </span>
                    )}
                    {j.current && (
                      <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-emerald-700">
                        Current
                      </span>
                    )}
                  </p>
                  {(j.designation || j.period) && (
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-slate-500">
                      {j.designation}
                      {j.designation && j.period && (
                        <span className="text-slate-300">·</span>
                      )}
                      {j.period && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarRange className="h-3 w-3 text-slate-300" />
                          {j.period}
                        </span>
                      )}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-3">
      <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-800">
        {value}
      </p>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof GraduationCap;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </p>
      {children}
    </div>
  );
}
