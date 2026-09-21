import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck } from 'lucide-react';

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from '@shared/components/ui';
import { formatRelative } from '@shared/utils';
import { ROUTES } from '@app/router/paths';
import { useMyDelegatedCandidates } from '@modules/assessment';

/** Most recent first, and only a few — the page below has the rest. */
const SHOWN = 4;

/**
 * The vacancies you personally have candidates to interview on.
 *
 * Shown only to people who actually have some. An interviewer signs in to a
 * dashboard built around requisitions they raised and hires they approved,
 * none of which is theirs — their own work sat one nav click away behind
 * "Assigned Candidates", and the usual way they found out about it was an
 * email. This puts it on the first screen they see.
 *
 * Grouped by requisition rather than listed per candidate: four people for
 * one post is one interview day to arrange, not four separate errands.
 *
 * Built from the same parts as every other panel here — plain Card, a
 * brand-marked title, a "View all" link, rows that tint on hover and carry
 * Badges. It is one card among five and should not announce itself as
 * something else.
 */
export function AssignedRequisitions() {
  const { data } = useMyDelegatedCandidates();
  const rows = data ?? [];
  if (rows.length === 0) return null;

  const byReq = new Map<
    string,
    {
      id: string;
      code: string;
      designation: string;
      department: string;
      unit: string;
      total: number;
      toSchedule: number;
      awaitingDecision: number;
      latest: string;
    }
  >();
  for (const row of rows) {
    const req = row.requisition;
    const first = row.rounds.find((r) => r.kind === 'first');
    const done =
      row.candidate.stage === 'final' || row.candidate.stage === 'rejected';
    const needsDate = !done && !first ? 1 : 0;
    const needsVerdict = !done && first?.status === 'completed' ? 1 : 0;
    const existing = byReq.get(req.id);
    if (existing) {
      existing.total += 1;
      existing.toSchedule += needsDate;
      existing.awaitingDecision += needsVerdict;
      if (row.createdAt > existing.latest) existing.latest = row.createdAt;
    } else {
      byReq.set(req.id, {
        id: req.id,
        code: req.code,
        designation: req.designation,
        department: req.department,
        unit: req.unitFactory,
        total: 1,
        toSchedule: needsDate,
        awaitingDecision: needsVerdict,
        latest: row.createdAt,
      });
    }
  }
  // Newest assignment first — the one they are most likely looking for.
  const groups = [...byReq.values()]
    .sort((a, z) => z.latest.localeCompare(a.latest))
    .slice(0, SHOWN);
  const more = byReq.size - groups.length;

  /**
   * Where a vacancy's work is actually sitting.
   *
   * The link carries the stage, and only the stage. It used to carry the
   * requisition too, which the page applied as a filter — that scoped the
   * tab counts to one vacancy, so every other tab read 0 and the rest of
   * the work looked like it had disappeared.
   */
  const stageOf = (g: { toSchedule: number; awaitingDecision: number }) =>
    g.toSchedule > 0
      ? 'to_schedule'
      : g.awaitingDecision > 0
        ? 'decision_due'
        : 'scheduled';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-brand-600" />
          Interviews to run
        </CardTitle>
        <Link
          to={ROUTES.assignedCandidates}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardBody className="space-y-1">
        {groups.map((g) => (
          <Link
            key={g.id}
            to={`${ROUTES.assignedCandidates}?stage=${stageOf(g)}`}
            className="block rounded-xl border border-transparent px-3 py-3 transition hover:border-slate-200 hover:bg-slate-50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {g.designation}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {g.code} · {g.unit}
                </p>
              </div>
              <p className="shrink-0 text-xs text-slate-400">
                {formatRelative(g.latest)}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge tone="brand">{g.total} to interview</Badge>
              {g.toSchedule > 0 && (
                <Badge tone="warning">{g.toSchedule} need a date</Badge>
              )}
              {g.awaitingDecision > 0 && (
                <Badge tone="info">{g.awaitingDecision} awaiting verdict</Badge>
              )}
              {g.department && <Badge tone="neutral">{g.department}</Badge>}
            </div>
          </Link>
        ))}
        {more > 0 && (
          <Link
            to={ROUTES.assignedCandidates}
            className="block px-3 pt-1 text-xs font-medium text-slate-400 transition-colors hover:text-brand-600"
          >
            {more} more {more === 1 ? 'vacancy' : 'vacancies'}
          </Link>
        )}
      </CardBody>
    </Card>
  );
}
