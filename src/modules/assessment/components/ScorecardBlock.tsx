import { Fragment, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

import { Spinner } from '@shared/components/ui';
import { resolveApiFileUrl } from '@shared/api';
import { cn } from '@shared/lib';

import { useScorecard } from '../hooks/useAssessment';
import type {
  ScorecardEntry,
  ScorecardTest,
} from '../types/assessment.types';

type SortKey =
  | 'combined'
  | 'cvScore'
  | 'written'
  | 'computer'
  | 'aiTest'
  | 'interviewAvg'
  | 'candidateName';

const STAGE_TONE: Record<string, string> = {
  applied: 'text-slate-500',
  ai_shortlisted: 'text-violet-600',
  shortlisted: 'text-sky-600',
  interview: 'text-amber-600',
  final: 'text-indigo-600',
  selected: 'text-emerald-600',
  rejected: 'text-rose-500',
};

/**
 * A faint tint, not a bar.
 *
 * The grid is read by comparing numbers down a column, so the numbers have to
 * stay the loudest thing on the page. A background wash puts the shape of the
 * data underneath them without competing for attention — and it survives
 * printing, which a coloured bar does not.
 */
function cellTint(value: number | null): string {
  if (value === null) return '';
  if (value >= 75) return 'bg-emerald-50/70';
  if (value >= 50) return 'bg-amber-50/60';
  return 'bg-rose-50/60';
}

function valueTone(value: number | null): string {
  if (value === null) return 'text-slate-300';
  if (value >= 75) return 'text-emerald-700';
  if (value >= 50) return 'text-amber-700';
  return 'text-rose-700';
}

const sortValue = (row: ScorecardEntry, key: SortKey): number | string => {
  switch (key) {
    case 'candidateName':
      return row.candidateName.toLowerCase();
    case 'written':
      return row.written.pct ?? -1;
    case 'computer':
      return row.computer.pct ?? -1;
    case 'aiTest':
      return row.aiTest.pct ?? -1;
    default:
      return row[key] ?? -1;
  }
};

/** A test cell: the mark, the percentage under it, tinted by the percentage. */
function TestCell({ test }: { test: ScorecardTest }) {
  if (!test.enabled) {
    return (
      <td className="px-3 py-2 text-center text-xs text-slate-300">skipped</td>
    );
  }
  if (test.pct === null) {
    return (
      <td className="px-3 py-2 text-center text-xs text-amber-600">pending</td>
    );
  }
  return (
    <td className={cn('px-3 py-2 text-right tabular-nums', cellTint(test.pct))}>
      <span className={cn('text-sm font-semibold', valueTone(test.pct))}>
        {test.pct.toFixed(1)}
      </span>
      <span className="ml-1 text-[0.6875rem] text-slate-400">
        {test.obtained}/{test.total}
      </span>
    </td>
  );
}

function ScoreCell({ value }: { value: number | null }) {
  return (
    <td className={cn('px-3 py-2 text-right tabular-nums', cellTint(value))}>
      <span className={cn('text-sm font-semibold', valueTone(value))}>
        {value === null ? '—' : value.toFixed(1)}
      </span>
    </td>
  );
}

function SortHead({
  label,
  sortKey,
  active,
  dir,
  onSort,
  align = 'right',
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={cn(
        'whitespace-nowrap px-3 py-2 text-[0.6875rem] font-semibold uppercase tracking-wide',
        align === 'left' ? 'text-left' : 'text-right',
        active ? 'text-slate-700' : 'text-slate-400',
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-slate-700"
      >
        {label}
        {active &&
          (dir === 'desc' ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronUp className="h-3 w-3" />
          ))}
      </button>
    </th>
  );
}

/**
 * The scorecard as a comparison matrix.
 *
 * One row per candidate, one column per component, so the question this table
 * exists to answer — "who is ahead, and on what" — is read straight down a
 * column. Every figure carries the marks it came from, because a percentage
 * is the derived number and the mark is the one people argue about. Opening a
 * row shows what each panelist gave and the marked script.
 */
export function ScorecardBlock({ reqId }: { reqId: string }) {
  const { data: rows, isLoading, refetch, isFetching } = useScorecard(reqId);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'combined',
    dir: 'desc',
  });
  const [open, setOpen] = useState<string | null>(null);

  const sorted = useMemo(() => {
    if (!rows) return [];
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      const cmp =
        typeof av === 'string' && typeof bv === 'string'
          ? av.localeCompare(bv)
          : Number(av) - Number(bv);
      return sort.dir === 'desc' ? -cmp : cmp;
    });
    return copy;
  }, [rows, sort]);

  const onSort = (key: SortKey) =>
    setSort((cur) =>
      cur.key === key
        ? { key, dir: cur.dir === 'desc' ? 'asc' : 'desc' }
        : { key, dir: key === 'candidateName' ? 'asc' : 'desc' },
    );

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-400">
        No evaluated candidates yet — scores appear once candidates have been
        screened or interviewed.
      </p>
    );
  }

  const ranked = new Map(
    [...rows]
      .sort((a, b) => (b.combined ?? -1) - (a.combined ?? -1))
      .map((r, i) => [r.candidateId, i + 1]),
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[0.6875rem] text-slate-400">
          Click a column to sort · click a row for panelist marks
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
        >
          <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full border-collapse text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="w-10 px-3 py-2 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                #
              </th>
              <SortHead
                label="Candidate"
                sortKey="candidateName"
                align="left"
                active={sort.key === 'candidateName'}
                dir={sort.dir}
                onSort={onSort}
              />
              <th className="px-3 py-2 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                Stage
              </th>
              <SortHead label="CV" sortKey="cvScore" active={sort.key === 'cvScore'} dir={sort.dir} onSort={onSort} />
              <SortHead label="Written" sortKey="written" active={sort.key === 'written'} dir={sort.dir} onSort={onSort} />
              <SortHead label="Computer" sortKey="computer" active={sort.key === 'computer'} dir={sort.dir} onSort={onSort} />
              <SortHead label="AI test" sortKey="aiTest" active={sort.key === 'aiTest'} dir={sort.dir} onSort={onSort} />
              <SortHead label="Interview" sortKey="interviewAvg" active={sort.key === 'interviewAvg'} dir={sort.dir} onSort={onSort} />
              <SortHead label="Combined" sortKey="combined" active={sort.key === 'combined'} dir={sort.dir} onSort={onSort} />
              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((row) => {
              const rank = ranked.get(row.candidateId)!;
              const isOpen = open === row.candidateId;
              return (
                // Keyed here rather than on the rows: a fragment is what the
                // map returns, and two <tr> cannot share one wrapper element
                // inside a <tbody>.
                <Fragment key={row.candidateId}>
                  <tr
                    onClick={() =>
                      setOpen((cur) =>
                        cur === row.candidateId ? null : row.candidateId,
                      )
                    }
                    className={cn(
                      'cursor-pointer bg-white transition-colors hover:bg-slate-50/80',
                      isOpen && 'bg-slate-50',
                    )}
                  >
                    <td className="px-3 py-2 text-xs font-semibold tabular-nums text-slate-400">
                      {rank}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2 font-medium text-slate-800">
                      {row.candidateName}
                    </td>
                    <td
                      className={cn(
                        'whitespace-nowrap px-3 py-2 text-xs capitalize',
                        STAGE_TONE[row.stage] ?? 'text-slate-500',
                      )}
                    >
                      {row.stage.replace(/_/g, ' ')}
                    </td>
                    <ScoreCell value={row.cvScore} />
                    <TestCell test={row.written} />
                    <TestCell test={row.computer} />
                    <TestCell test={row.aiTest} />
                    <ScoreCell value={row.interviewAvg} />
                    <td
                      className={cn(
                        'px-3 py-2 text-right tabular-nums',
                        cellTint(row.combined),
                      )}
                    >
                      <span
                        className={cn(
                          'text-base font-bold',
                          valueTone(row.combined),
                        )}
                      >
                        {row.combined === null ? '—' : row.combined.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-slate-300">
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          isOpen && 'rotate-180 text-slate-500',
                        )}
                      />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-slate-50/60">
                      <td colSpan={10} className="px-4 py-3">
                        <RowDetail row={row} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowDetail({ row }: { row: ScorecardEntry }) {
  const sheets = [
    { label: 'Written Test', url: row.written.sheetUrl },
    { label: 'Computer Literacy', url: row.computer.sheetUrl },
  ].filter((s) => s.url);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
          Panelist marks
        </p>
        {row.interviewers.length === 0 ? (
          <p className="text-xs text-slate-400">
            No interview marks submitted yet.
          </p>
        ) : (
          <table className="w-full text-xs">
            <tbody className="divide-y divide-slate-100">
              {row.interviewers.map((ev) => (
                <tr key={`${ev.evaluatorName}-${ev.submittedAt}`}>
                  <td className="py-1 pr-3 font-medium text-slate-700">
                    {ev.evaluatorName}
                  </td>
                  <td className="py-1 pr-3 capitalize text-slate-400">
                    {ev.roundKind ? `${ev.roundKind} round` : '—'}
                  </td>
                  <td className="py-1 pr-3 text-right tabular-nums text-slate-500">
                    {ev.total} / {ev.max}
                  </td>
                  <td
                    className={cn(
                      'py-1 text-right font-semibold tabular-nums',
                      valueTone(ev.pct),
                    )}
                  >
                    {ev.pct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
          Exam sheets
        </p>
        {sheets.length === 0 ? (
          <p className="text-xs text-slate-400">None attached.</p>
        ) : (
          <ul className="space-y-1">
            {sheets.map((s) => (
              <li key={s.label}>
                <a
                  href={resolveApiFileUrl(s.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> {s.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
