import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  ClipboardList,
  LayoutGrid,
  Network,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react';

import {
  Badge,
  EmptyState,
  FullPageSpinner,
  Input,
  PageHeader,
  StatCard,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { ROUTES } from '@app/router/paths';

import { useRequisitions } from '@modules/requisition/hooks/useRequisitions';
import type {
  CandidateStats,
  Requisition,
} from '@modules/requisition/types/requisition.types';
import {
  PRIORITY_LABEL,
  PRIORITY_TONE,
} from '@modules/requisition/constants';
import { useMyPermissions } from '@modules/rbac';
import { canAccessRecruitment } from '@modules/candidates';

const STAGE_SEGMENTS: {
  key: keyof Omit<CandidateStats, 'total'>;
  label: string;
  bar: string;
  dot: string;
}[] = [
  { key: 'applied', label: 'Applied', bar: 'bg-slate-300', dot: 'bg-slate-400' },
  {
    key: 'ai_shortlisted',
    label: 'AI Shortlisted',
    bar: 'bg-violet-400',
    dot: 'bg-violet-500',
  },
  { key: 'shortlisted', label: 'Shortlisted', bar: 'bg-sky-400', dot: 'bg-sky-500' },
  { key: 'interview', label: 'Interview', bar: 'bg-amber-400', dot: 'bg-amber-500' },
  { key: 'final', label: 'Final', bar: 'bg-indigo-400', dot: 'bg-indigo-500' },
  { key: 'selected', label: 'Selected', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  { key: 'rejected', label: 'Rejected', bar: 'bg-rose-300', dot: 'bg-rose-400' },
];

export default function RecruitmentPage() {
  const { data: perms, isLoading: permsLoading } = useMyPermissions();
  const { data, isLoading } = useRequisitions({
    status: 'posted',
    page: 1,
    pageSize: 100,
  });

  const [unit, setUnit] = useState('all');
  const [unitSearch, setUnitSearch] = useState('');
  const [search, setSearch] = useState('');

  const requisitions = useMemo(() => data?.items ?? [], [data]);

  const cvOf = (r: Requisition) => r.candidateStats?.total ?? 0;

  const units = useMemo(() => {
    const m = new Map<string, { count: number; cvs: number }>();
    for (const r of requisitions) {
      const e = m.get(r.unitFactory) ?? { count: 0, cvs: 0 };
      e.count += 1;
      e.cvs += cvOf(r);
      m.set(r.unitFactory, e);
    }
    return [...m.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [requisitions]);

  const visibleUnits = useMemo(() => {
    const t = unitSearch.trim().toLowerCase();
    return t ? units.filter((u) => u.name.toLowerCase().includes(t)) : units;
  }, [units, unitSearch]);

  const positions = useMemo(() => {
    const t = search.trim().toLowerCase();
    return requisitions
      .filter((r) => (unit === 'all' ? true : r.unitFactory === unit))
      .filter((r) =>
        !t
          ? true
          : r.designation.toLowerCase().includes(t) ||
            r.code.toLowerCase().includes(t) ||
            r.department.toLowerCase().includes(t),
      )
      .sort((a, b) => cvOf(b) - cvOf(a) || a.designation.localeCompare(b.designation));
  }, [requisitions, unit, search]);

  const totalCvs = useMemo(
    () => requisitions.reduce((s, r) => s + cvOf(r), 0),
    [requisitions],
  );

  if (isLoading || permsLoading)
    return <FullPageSpinner label="Loading recruitment…" />;

  if (!canAccessRecruitment(perms)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Candidates" />
        <EmptyState
          icon={<ShieldAlert className="h-6 w-6" />}
          title="Restricted to recruitment roles"
          description="The candidate pipeline is available to Corporate HR, CHRO and super users only."
        />
      </div>
    );
  }

  const selectedUnit = unit === 'all' ? null : units.find((u) => u.name === unit);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidates"
        description="Published positions and their CV pipelines, organised by unit."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Open positions"
          value={requisitions.length}
          icon={ClipboardList}
          accent="brand"
        />
        <StatCard
          label="Total candidates"
          value={totalCvs}
          icon={Users}
          accent="emerald"
        />
        <StatCard label="Units hiring" value={units.length} icon={Network} accent="violet" />
      </div>

      {requisitions.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No active recruitment yet"
          description="Once Corporate HR posts an approved requisition, it appears here with its CV workspace."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[268px_1fr]">
          {/* Units rail */}
          <aside className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-3">
              <Input
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
                placeholder="Find a unit…"
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="max-h-[28rem] space-y-0.5 overflow-y-auto p-2">
              <UnitButton
                label="All units"
                icon={<LayoutGrid className="h-4 w-4" />}
                count={requisitions.length}
                cvs={totalCvs}
                active={unit === 'all'}
                onClick={() => setUnit('all')}
              />
              <div className="my-1 border-t border-slate-100" />
              {visibleUnits.map((u) => (
                <UnitButton
                  key={u.name}
                  label={u.name}
                  icon={<Building2 className="h-4 w-4" />}
                  count={u.count}
                  cvs={u.cvs}
                  active={unit === u.name}
                  onClick={() => setUnit(u.name)}
                />
              ))}
              {visibleUnits.length === 0 && (
                <p className="px-3 py-6 text-center text-xs text-slate-400">
                  No unit matches.
                </p>
              )}
            </div>
          </aside>

          {/* Positions */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {selectedUnit ? selectedUnit.name : 'All units'}
                </h2>
                <p className="text-xs text-slate-500">
                  {positions.length} position{positions.length === 1 ? '' : 's'}
                  {' · '}
                  {(selectedUnit ? selectedUnit.cvs : totalCvs)} candidate
                  {(selectedUnit ? selectedUnit.cvs : totalCvs) === 1 ? '' : 's'}
                </p>
              </div>
              <div className="w-full sm:w-64">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search position, code, dept…"
                  leftIcon={<Search className="h-4 w-4" />}
                />
              </div>
            </div>

            {positions.length === 0 ? (
              <p className="px-4 py-16 text-center text-sm text-slate-400">
                No positions match your filter.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-2.5 font-medium">Position</th>
                      {unit === 'all' && (
                        <th className="hidden px-4 py-2.5 font-medium lg:table-cell">
                          Unit
                        </th>
                      )}
                      <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                        Pipeline
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium">CVs</th>
                      <th className="px-2 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {positions.map((r) => (
                      <PositionRow key={r.id} req={r} showUnit={unit === 'all'} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 px-4 py-2.5">
              {STAGE_SEGMENTS.filter((s) => s.key !== 'rejected').map((s) => (
                <span
                  key={s.key}
                  className="inline-flex items-center gap-1.5 text-[11px] text-slate-400"
                >
                  <span className={cn('h-2 w-2 rounded-full', s.dot)} />
                  {s.label}
                </span>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function UnitButton({
  label,
  icon,
  count,
  cvs,
  active,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  count: number;
  cvs: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition',
        active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50',
      )}
    >
      <span className={cn(active ? 'text-brand-600' : 'text-slate-400')}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{label}</span>
        <span
          className={cn(
            'text-[11px]',
            active ? 'text-brand-500' : 'text-slate-400',
          )}
        >
          {count} position{count === 1 ? '' : 's'} · {cvs} CV
        </span>
      </span>
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
          active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500',
        )}
      >
        {count}
      </span>
    </button>
  );
}

const FUNNEL: {
  key: keyof Omit<CandidateStats, 'total'>;
  abbr: string;
  label: string;
  color: string;
}[] = [
  { key: 'applied', abbr: 'Ap', label: 'Applied', color: 'bg-slate-400' },
  { key: 'ai_shortlisted', abbr: 'AI', label: 'AI Shortlisted', color: 'bg-violet-500' },
  { key: 'shortlisted', abbr: 'Sh', label: 'Shortlisted', color: 'bg-sky-500' },
  { key: 'interview', abbr: 'In', label: 'Interview', color: 'bg-amber-500' },
  { key: 'final', abbr: 'Fi', label: 'Final', color: 'bg-indigo-500' },
  { key: 'selected', abbr: 'Se', label: 'Selected', color: 'bg-emerald-500' },
];

function FunnelStepper({ stats }: { stats?: CandidateStats }) {
  const title = STAGE_SEGMENTS.map((s) => `${s.label}: ${stats?.[s.key] ?? 0}`).join(
    ' · ',
  );
  return (
    <div className="flex items-center" title={title}>
      {FUNNEL.map((s, i) => {
        const v = stats?.[s.key] ?? 0;
        const has = v > 0;
        return (
          <Fragment key={s.key}>
            {i > 0 && <span className="h-px w-2.5 bg-slate-200" />}
            <span className="flex flex-col items-center gap-0.5">
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums',
                  has ? `${s.color} text-white` : 'bg-slate-100 text-slate-300',
                )}
              >
                {v}
              </span>
              <span className="text-[9px] uppercase tracking-wide text-slate-400">
                {s.abbr}
              </span>
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}

function PositionRow({ req, showUnit }: { req: Requisition; showUnit: boolean }) {
  return (
    <tr className="group transition hover:bg-slate-50/70">
      <td className="px-4 py-3">
        <Link
          to={ROUTES.requisitionDetail(req.id)}
          state={{ from: ROUTES.candidates, fromLabel: 'candidates' }}
          className="block"
        >
          <span className="flex items-center gap-2">
            <span className="font-medium text-slate-800 group-hover:text-brand-700">
              {req.designation}
            </span>
            <Badge tone={PRIORITY_TONE[req.priority]} dot>
              {PRIORITY_LABEL[req.priority]}
            </Badge>
          </span>
          <span className="text-xs text-slate-400">
            {req.code} · {req.department} · {req.requiredPosts} post
            {req.requiredPosts === 1 ? '' : 's'}
          </span>
        </Link>
      </td>
      {showUnit && (
        <td className="hidden px-4 py-3 text-sm text-slate-500 lg:table-cell">
          {req.unitFactory}
        </td>
      )}
      <td className="hidden px-4 py-3 md:table-cell">
        <FunnelStepper stats={req.candidateStats} />
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-semibold text-slate-700">
          {req.candidateStats?.total ?? 0}
        </span>
      </td>
      <td className="px-2 py-3 text-right">
        <Link
          to={ROUTES.requisitionDetail(req.id)}
          state={{ from: ROUTES.candidates, fromLabel: 'candidates' }}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-brand-600 hover:bg-brand-50"
        >
          Open <ArrowRight className="h-4 w-4" />
        </Link>
      </td>
    </tr>
  );
}
