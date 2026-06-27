import { useQuery } from '@tanstack/react-query';
import { Briefcase, Calendar, CheckCircle2, Clock, X } from 'lucide-react';

import { Avatar } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';

import { candidatesApi } from '../api/candidates.api';

const STAGE_LABEL: Record<string, string> = {
  applied: 'Applied',
  ai_shortlisted: 'AI Shortlisted',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  final: 'Final',
  selected: 'Selected',
  rejected: 'Rejected',
};

const STAGE_TONE: Record<string, string> = {
  selected: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-600',
  interview: 'bg-amber-50 text-amber-700',
  final: 'bg-indigo-50 text-indigo-700',
  shortlisted: 'bg-sky-50 text-sky-700',
  ai_shortlisted: 'bg-violet-50 text-violet-700',
  applied: 'bg-slate-100 text-slate-500',
};

export function ApplyHistoryModal({
  candidateId,
  candidateName,
  onClose,
}: {
  candidateId: string;
  candidateName: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['apply-history', candidateId],
    queryFn: () => candidatesApi.applyHistory(candidateId),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Applied History of Applicant
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Candidate summary row */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <Avatar name={data?.name ?? candidateName} size="md" />
            <div>
              <p className="font-semibold text-slate-900">
                {data?.name ?? candidateName}
              </p>
              {data?.email && (
                <p className="text-xs text-slate-400">{data.email}</p>
              )}
            </div>
          </div>
          {data && (
            <span className="shrink-0 text-sm font-medium text-slate-500">
              Total Applied:{' '}
              <span className="font-bold text-slate-800">{data.total}</span>
            </span>
          )}
        </div>

        {/* Application list */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {isLoading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          )}

          {data && data.applications.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              No application history found.
            </p>
          )}

          {data && (
            <div className="flex flex-col gap-3">
              {data.applications.map((app) => (
                <div
                  key={app.candidateId}
                  className="rounded-xl border border-slate-200 px-4 py-3.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {app.designation}
                        </p>
                        <p className="text-xs text-slate-400">
                          {app.department} · {app.unitFactory}
                        </p>
                        <p className="text-[11px] text-slate-400">{app.code}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Viewed / Not Viewed status */}
                      <span
                        className={cn(
                          'flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                          app.viewed
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-slate-50 text-slate-500',
                        )}
                      >
                        {app.viewed ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {app.viewed ? 'Viewed' : 'Not Viewed'}
                      </span>

                      {/* Stage badge */}
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-medium',
                          STAGE_TONE[app.stage] ?? STAGE_TONE['applied'],
                        )}
                      >
                        {STAGE_LABEL[app.stage] ?? app.stage}
                      </span>
                    </div>
                  </div>

                  {/* Dates row */}
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-0.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Published: {formatDate(app.postedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Applied: {formatDate(app.appliedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
