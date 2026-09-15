import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCcw, ShieldCheck, Stethoscope } from 'lucide-react';

import { Card, CardBody, CardHeader, CardTitle } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatRelative } from '@shared/utils';
import { ROUTES } from '@app/router/paths';
import {
  useMedicalApprovalQueue,
  useMedicalQueue,
  type MedicalApprovalRow,
  type MedicalQueueItem,
} from '@modules/onboarding';

/**
 * Medical work, on the dashboard.
 *
 * A requisitioner opens the dashboard and sees their latest requisitions; a
 * medical officer saw a department breakdown and other people's hiring. These
 * give each medical role the same thing: the list they are actually responsible
 * for, with the count, newest work surfaced and a way through to the full page.
 *
 * Both read the same endpoints as their full pages rather than a dashboard
 * summary, so the number on the card can never disagree with the number on the
 * page it links to.
 */

function QueueCard({
  title,
  icon,
  to,
  count,
  isLoading,
  emptyText,
  children,
}: {
  title: string;
  icon: ReactNode;
  to: string;
  count: number;
  isLoading: boolean;
  emptyText: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
          {count > 0 && (
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[0.625rem] font-bold tabular-nums text-white">
              {count}
            </span>
          )}
        </CardTitle>
        <Link
          to={to}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardBody className="space-y-1">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : count === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">{emptyText}</p>
        ) : (
          children
        )}
      </CardBody>
    </Card>
  );
}

/** Candidates the examining officer still has to see. */
export function MedicalExamCard() {
  const { data = [], isLoading } = useMedicalQueue();
  // Anything the CMO returned comes first: it has already waited a full cycle,
  // and it carries an instruction somebody is expecting to be acted on.
  const rows = [...data].sort(
    (a, b) => Number(Boolean(b.medicalCmoNote)) - Number(Boolean(a.medicalCmoNote)),
  );

  return (
    <QueueCard
      title="Awaiting Examination"
      icon={<Stethoscope className="h-4 w-4 text-brand-600" />}
      to={ROUTES.medical}
      count={data.length}
      isLoading={isLoading}
      emptyText="No candidates are waiting for a medical."
    >
      {rows.slice(0, 6).map((item: MedicalQueueItem) => {
        const sentBack = Boolean(item.medicalCmoNote);
        return (
          <Link
            key={item.id}
            to={ROUTES.medical}
            className="block rounded-xl border border-transparent px-3 py-2.5 transition hover:border-slate-200 hover:bg-slate-50"
          >
            <div className="flex items-start gap-2.5">
              <span
                aria-hidden
                className={cn(
                  'mt-1 h-7 w-[3px] shrink-0 rounded-full',
                  sentBack ? 'bg-amber-500' : 'bg-slate-200',
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {item.candidate.name}
                  </p>
                  {sentBack && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wide text-amber-700">
                      <RotateCcw className="h-2 w-2" />
                      Sent back
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-slate-500">
                  {item.candidate.designation} · {item.candidate.unit}
                </p>
                {sentBack && (
                  <p className="mt-0.5 truncate text-xs italic text-amber-700">
                    {item.medicalCmoNote}
                  </p>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </QueueCard>
  );
}

/** Findings waiting on the Central Medical Officer's confirmation. */
export function MedicalApprovalCard({ enabled }: { enabled: boolean }) {
  const { data = [], isLoading } = useMedicalApprovalQueue(enabled);
  // Proposed rejections first — they end a hire, and they are the ones to read
  // properly rather than sweep through.
  const rows = [...data].sort(
    (a, b) =>
      Number(a.proposed === 'cleared') - Number(b.proposed === 'cleared'),
  );

  return (
    <QueueCard
      title="Awaiting Your Approval"
      icon={<ShieldCheck className="h-4 w-4 text-brand-600" />}
      to={ROUTES.medicalApprovals}
      count={data.length}
      isLoading={isLoading}
      emptyText="Every submitted finding has been dealt with."
    >
      {rows.slice(0, 6).map((row: MedicalApprovalRow) => {
        const fit = row.proposed === 'cleared';
        return (
          <Link
            key={row.onboardingId}
            to={ROUTES.medicalApprovals}
            className="block rounded-xl border border-transparent px-3 py-2.5 transition hover:border-slate-200 hover:bg-slate-50"
          >
            <div className="flex items-start gap-2.5">
              <span
                aria-hidden
                className={cn(
                  'mt-1 h-7 w-[3px] shrink-0 rounded-full',
                  fit ? 'bg-emerald-500' : 'bg-rose-500',
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {row.candidateName}
                  </p>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wide',
                      fit
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700',
                    )}
                  >
                    {fit ? 'Fit' : 'Unfit'}
                  </span>
                </div>
                <p className="truncate text-xs text-slate-500">
                  {row.requisition.designation} · {row.requisition.unitFactory}
                </p>
                <p className="truncate text-[0.6875rem] text-slate-400">
                  {row.submittedBy ? `${row.submittedBy} · ` : ''}
                  {row.submittedAt ? formatRelative(row.submittedAt) : ''}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </QueueCard>
  );
}
