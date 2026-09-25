import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Save, UserCheck, UserCog, UserPlus } from 'lucide-react';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Select,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';

import type { CvSource, Requisition } from '../types/requisition.types';
import { requisitionApi } from '../api/requisition.api';
import { CV_SOURCE_LABEL, CV_SOURCES } from '../constants';
import { CV_SOURCE_META } from '../cvSourceMeta';
import {
  useAssignRecruiter,
  useSetCvSources,
} from '../hooks/useRequisitionActions';

/**
 * Head of Talent Acquisition nominates the Corporate Recruiter who runs this requisition's
 * hiring lifecycle. Additive — Head of Talent Acquisition and CHRO keep their own access.
 *
 * Where the CVs are to come from is settled first, on the same card: the
 * recruiter is handed a brief, not just a post. The API refuses an
 * assignment without sources, so the picker waits for them here too.
 */
export function RecruiterPanel({
  requisition,
  canAssign,
}: {
  requisition: Requisition;
  canAssign: boolean;
}) {
  const [picked, setPicked] = useState('');
  const assign = useAssignRecruiter();
  const saveSources = useSetCvSources();

  const savedSources = requisition.cvSources ?? [];
  const savedKey = savedSources.join('|');
  const [sources, setSources] = useState<CvSource[]>(savedSources);
  // A live update (another HoTA saving) replaces what is ticked here.
  useEffect(() => {
    setSources(requisition.cvSources ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);
  const toggle = (s: CvSource) =>
    setSources((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
    );
  const ordered = CV_SOURCES.map((o) => o.value).filter((v) =>
    sources.includes(v),
  );
  const sourcesDirty = ordered.join('|') !== savedKey;
  const hasSources = savedSources.length > 0;

  const { data: recruiters = [], isLoading } = useQuery({
    queryKey: ['requisition', requisition.id, 'recruiters'],
    queryFn: () => requisitionApi.listRecruiters(requisition.id),
    enabled: canAssign,
  });

  const current = requisition.recruiter;
  // Only ever present while the cover actually applies — the API drops a
  // lapsed one rather than reporting it as current.
  const cover = requisition.cover ?? null;

  // Nothing to show a non-assigner when nothing has been decided yet.
  if (!canAssign && !current && !hasSources) return null;

  const options = [
    { value: '', label: current ? 'Change recruiter…' : 'Select a recruiter…' },
    ...recruiters
      .filter((r) => r.id !== current?.id)
      .map((r) => ({ value: r.id, label: `${r.name} · ${r.employeeCode}` })),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-4 w-4 text-brand-600" />
          Corporate Recruiter
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                CV collection sources
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {requisition.cvSourcesSetBy && requisition.cvSourcesSetAt
                  ? `Set by ${requisition.cvSourcesSetBy} · ${formatDate(requisition.cvSourcesSetAt)}`
                  : 'Where the recruiter should look for CVs'}
              </p>
            </div>
            {canAssign && (
              <div className="flex items-center gap-3 text-xs">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold tabular-nums text-slate-600">
                  {ordered.length} of {CV_SOURCES.length} selected
                </span>
                <button
                  type="button"
                  className="font-semibold text-brand-600 hover:text-brand-800 disabled:text-slate-300"
                  disabled={ordered.length === CV_SOURCES.length}
                  onClick={() => setSources(CV_SOURCES.map((o) => o.value))}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="font-semibold text-slate-500 hover:text-slate-800 disabled:text-slate-300"
                  disabled={ordered.length === 0}
                  onClick={() => setSources([])}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          {canAssign ? (
            <>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {CV_SOURCES.map((o) => {
                  const meta = CV_SOURCE_META[o.value];
                  const Icon = meta.icon;
                  const on = sources.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(o.value)}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                        on
                          ? cn(meta.tone, 'shadow-sm')
                          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-opacity',
                          meta.badge,
                          !on && 'opacity-80 group-hover:opacity-100',
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-800">
                          {o.label}
                        </span>
                        <span className="block truncate text-[11px] text-slate-500">
                          {meta.hint}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                          on
                            ? 'border-transparent bg-brand-600 text-white'
                            : 'border-slate-300 bg-white text-transparent',
                        )}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    </button>
                  );
                })}
              </div>
              {(sourcesDirty || !hasSources) && (
                <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl bg-slate-50 px-3 py-2">
                  <p className="mr-auto text-xs text-slate-500">
                    {!hasSources && ordered.length === 0 ? (
                      <span className="text-amber-700">
                        Pick where the CVs will come from — a recruiter can be
                        assigned once this is saved.
                      </span>
                    ) : sourcesDirty ? (
                      'Unsaved changes'
                    ) : null}
                  </p>
                  {sourcesDirty && hasSources && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSources(savedSources)}
                    >
                      Undo
                    </Button>
                  )}
                  <Button
                    size="sm"
                    leftIcon={<Save className="h-4 w-4" />}
                    disabled={ordered.length === 0 || !sourcesDirty}
                    isLoading={saveSources.isPending}
                    onClick={() =>
                      saveSources.mutate({ id: requisition.id, sources: ordered })
                    }
                  >
                    Save sources
                  </Button>
                </div>
              )}
              {saveSources.isError && (
                <p className="text-sm text-red-600">
                  {(saveSources.error as Error).message}
                </p>
              )}
            </>
          ) : hasSources ? (
            <div className="flex flex-wrap gap-2">
              {savedSources.map((s) => {
                const meta = CV_SOURCE_META[s];
                const Icon = meta?.icon;
                return (
                  <span
                    key={s}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
                      meta?.tone ?? 'border-slate-200 bg-slate-50 text-slate-700',
                    )}
                  >
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {CV_SOURCE_LABEL[s] ?? s}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Not chosen yet.</p>
          )}
        </section>

        <div className="border-t border-slate-100" />

        {current ? (
          <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2">
            <p className="text-sm font-medium text-slate-800">{current.name}</p>
            <p className="text-xs text-slate-500">
              {current.employeeCode}
              {requisition.recruiterAssignedAt
                ? ` · assigned ${formatDate(requisition.recruiterAssignedAt)}`
                : ''}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No recruiter assigned yet — Head of Talent Acquisition still runs this
            requisition.
          </p>
        )}

        {cover && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800">
              <span className="font-medium">{cover.name}</span> is covering
              while {current?.name ?? 'the recruiter'} is on leave
              {cover.until ? ` (until ${formatDate(cover.until)})` : ''}. Both
              can act on it; it reverts on their return.
            </p>
          </div>
        )}

        {canAssign && (
          <>
            {!hasSources ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Save the CV collection sources above to assign a recruiter.
              </p>
            ) : !isLoading && recruiters.length === 0 ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Nobody holds the Corporate Recruiter role for this unit yet —
                grant it in Configuration → Access Control first.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-[14rem] flex-1">
                  <Select
                    options={options}
                    value={picked}
                    onChange={(e) => setPicked(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  leftIcon={<UserPlus className="h-4 w-4" />}
                  disabled={!picked || assign.isPending}
                  isLoading={assign.isPending}
                  onClick={() =>
                    assign.mutate(
                      { id: requisition.id, recruiterId: picked },
                      { onSuccess: () => setPicked('') },
                    )
                  }
                >
                  {current ? 'Reassign' : 'Assign'}
                </Button>
                {current && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={assign.isPending}
                    onClick={() =>
                      assign.mutate({
                        id: requisition.id,
                        recruiterId: null,
                      })
                    }
                  >
                    Clear
                  </Button>
                )}
              </div>
            )}
            {assign.isError && (
              <p className="text-sm text-red-600">
                {(assign.error as Error).message}
              </p>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
