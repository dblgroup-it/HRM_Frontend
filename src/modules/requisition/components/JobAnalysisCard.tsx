import { CheckCircle2, FileText, Paperclip } from 'lucide-react';

import { Card } from '@shared/components/ui';
import { formatDate } from '@shared/utils';

import type { Requisition } from '../types/requisition.types';
import { JobAnalysisSection } from './JobAnalysisPanel';
import { AttachmentsSection } from './AttachmentsPanel';

/**
 * Section B and the requisition's files, one after the other in one card.
 *
 * They used to be two cards in different columns, and then two tabs of one
 * card — either way the person writing the job analysis was told "attach the
 * detailed JD" by something they could not see, and a reader of a finished
 * requisition had to click to learn whether a JD was attached at all. They
 * are one job, so they read as one page: the analysis, then its files.
 */
export function JobAnalysisCard({
  requisition,
  canEditFiles,
}: {
  requisition: Requisition;
  /**
   * May this viewer add or remove files? The detailed JD is part of what the
   * chain signed off, so an approved requisition's files are read-only for
   * everyone but corporate and the recruiter running the hire.
   */
  canEditFiles: boolean;
}) {
  const attachmentCount = requisition.attachments?.length ?? 0;
  const pending = requisition.status === 'pending_job_analysis';
  const completedBy = requisition.jobAnalysis?.completedBy;
  const completedAt = requisition.jobAnalysis?.completedAt;

  return (
    <Card className="relative overflow-hidden">
      <div className="space-y-6 p-5 sm:p-6">
        <section className="space-y-4">
          <header className="flex flex-wrap items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-[12rem] flex-1">
              <h3 className="text-base font-semibold text-slate-900">
                B · Job Analysis
              </h3>
              <p className="text-xs text-slate-500">
                Job description and specification, written by HR from the
                vacancy
              </p>
            </div>
            {pending ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                In progress
              </span>
            ) : completedBy ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {completedBy.name}
                {completedAt ? ` · ${formatDate(completedAt)}` : ''}
              </span>
            ) : null}
          </header>
          <JobAnalysisSection
            requisition={requisition}
            attachments={
              <section className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3.5 py-3">
                <header className="mb-2 flex items-center gap-2">
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <h3 className="text-xs font-semibold text-slate-700">
                    Attachments
                  </h3>
                  {attachmentCount > 0 && (
                    <span className="min-w-[1.25rem] rounded-full bg-brand-50 px-1.5 text-center text-[0.6875rem] font-semibold tabular-nums leading-5 text-brand-700">
                      {attachmentCount}
                    </span>
                  )}
                  <span className="text-[0.6875rem] text-slate-400">
                    · optional
                  </span>
                </header>
                <AttachmentsSection
                  requisition={requisition}
                  canEdit={canEditFiles}
                />
              </section>
            }
          />
        </section>

      </div>
    </Card>
  );
}
