import { lazy, Suspense, useState } from 'react';
import { ExternalLink, Inbox, Send, UserPlus } from 'lucide-react';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from '@shared/components/ui';
import { formatDate } from '@shared/utils';
import type { CvSource } from '@modules/requisition/types/requisition.types';

import { useSubmittedCvs } from '../hooks/useCandidates';
import { GenderBadge } from './GenderBadge';
import { SubmitCvsModal } from './SubmitCvsModal';

const ApplyHistoryModal = lazy(() =>
  import('./ApplyHistoryModal').then((m) => ({ default: m.ApplyHistoryModal })),
);

/**
 * Factory HR / Factory HR Head's part in a published job: sending CVs in.
 *
 * Sits on Profile & Posting beside the public application link, which is the
 * other way CVs reach the recruiter. Below the button is what this person has
 * already sent, with the two things they would want to know about each one:
 * the gender the AI read off the CV, and whether the same person — by email
 * or mobile — has applied to DBL before, and where.
 */
export function FactoryCvIntakePanel({
  reqId,
  reqLabel,
  cvSources,
}: {
  reqId: string;
  reqLabel: string;
  cvSources?: CvSource[];
}) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<{ id: string; name: string } | null>(
    null,
  );
  const { data: sent = [], isLoading } = useSubmittedCvs(reqId);

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Send CVs to the recruiter</CardTitle>
          <p className="mt-0.5 text-sm text-slate-500">
            One CV or several. They reach the recruiter as Applied, and the
            recruiter shortlists.
          </p>
        </div>
        <Button leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => setOpen(true)}>
          Add candidates
        </Button>
      </CardHeader>
      <CardBody>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Sent by you{sent.length ? ` · ${sent.length}` : ''}
        </p>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
        ) : sent.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-slate-200 py-8 text-center">
            <Inbox className="h-6 w-6 text-slate-300" />
            <p className="text-sm text-slate-500">You have not sent any CVs for this job yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {sent.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-sm font-medium text-slate-800">{c.name}</span>
                  <GenderBadge gender={c.gender} />
                  {c.applyCount > 1 && (
                    <button
                      type="button"
                      onClick={() => setHistory({ id: c.id, name: c.name })}
                      className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[0.625rem] font-semibold text-amber-700 ring-1 ring-amber-200 transition-colors hover:bg-amber-100"
                      title="Where else this person applied"
                    >
                      Applied {c.applyCount}×
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  {c.cvSourceLabel && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                      {c.cvSourceLabel}
                    </span>
                  )}
                  {c.referral && (
                    <span
                      className="rounded-full bg-violet-50 px-2 py-0.5 font-medium text-violet-700"
                      title={[c.referral.employeeCode, c.referral.name, c.referral.designation]
                        .filter(Boolean)
                        .join(' – ')}
                    >
                      Referral · {c.referral.name}
                    </span>
                  )}
                  <span className="tabular-nums">{formatDate(c.createdAt)}</span>
                  {c.cvUrl && (
                    <a
                      href={c.cvUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
                    >
                      CV <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {sent.length > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <Send className="h-3 w-3" />
            Gender and "Applied N×" appear once the AI has read the CV — usually
            within a minute.
          </p>
        )}
      </CardBody>

      <SubmitCvsModal
        reqId={reqId}
        reqLabel={reqLabel}
        cvSources={cvSources}
        open={open}
        onClose={() => setOpen(false)}
      />
      {history && (
        <Suspense fallback={null}>
          <ApplyHistoryModal
            candidateId={history.id}
            candidateName={history.name}
            onClose={() => setHistory(null)}
          />
        </Suspense>
      )}
    </Card>
  );
}
