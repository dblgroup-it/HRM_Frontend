import { useState } from 'react';
import { FileText, Paperclip } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Card, CardBody } from '@shared/components/ui';
import { cn } from '@shared/lib';

import type { Requisition } from '../types/requisition.types';
import { JobAnalysisSection } from './JobAnalysisPanel';
import { AttachmentsSection } from './AttachmentsPanel';

type Tab = 'analysis' | 'attachments';

/**
 * Section B and the requisition's files, behind one heading.
 *
 * They used to be two cards stacked in different columns, with the
 * attachments below the fold on the far side of the page — which meant the
 * person writing the job analysis was told "attach the detailed JD" by a card
 * they could not see. They are one job: the JD is written here and filed here.
 *
 * A card-level tab bar rather than the page's glass one — that bar is the
 * lifecycle, and a second copy of it inside a card would read as another
 * lifecycle. This is a segmented switch that keeps its own row.
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
  const [tab, setTab] = useState<Tab>('analysis');
  const attachmentCount = requisition.attachments?.length ?? 0;
  /** Amber while nobody has written it — the tab says what is outstanding. */
  const pending = requisition.status === 'pending_job_analysis';

  const tabs: {
    key: Tab;
    label: string;
    icon: LucideIcon;
    count?: number;
    dot?: boolean;
  }[] = [
    { key: 'analysis', label: 'B · Job Analysis', icon: FileText, dot: pending },
    {
      key: 'attachments',
      label: 'Attachments',
      icon: Paperclip,
      count: attachmentCount,
    },
  ];

  return (
    <Card className="relative overflow-hidden">
      <div
        role="tablist"
        aria-label="Job analysis and attachments"
        className="flex items-center gap-1 border-b border-slate-100 bg-slate-50/70 px-2 py-2"
      >
        {tabs.map((t) => {
          const on = t.key === tab;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.key)}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                on
                  ? 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-200/80'
                  : 'text-slate-500 hover:bg-white/70 hover:text-slate-700',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  on ? 'text-brand-600' : 'text-slate-400',
                )}
              />
              <span className="truncate">{t.label}</span>
              {t.dot && (
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-500" />
              )}
              {t.count !== undefined && t.count > 0 && (
                <span
                  className={cn(
                    'min-w-[1.25rem] rounded-full px-1.5 text-center text-[0.6875rem] font-semibold tabular-nums leading-5',
                    on
                      ? 'bg-brand-50 text-brand-700'
                      : 'bg-slate-200/70 text-slate-500',
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <CardBody>
        {/* Both tabs stay mounted and the inactive one is hidden.
            Swapping them out unmounted the job-analysis form, and with it
            everything typed into it — so drafting section B with AI and then
            stepping over to attach the detailed JD, which the form itself
            tells you to do, threw the draft away. Nothing here is expensive
            enough to be worth unmounting for. */}
        <div className={tab === 'analysis' ? 'animate-fade-in' : 'hidden'}>
          <JobAnalysisSection requisition={requisition} />
        </div>
        <div className={tab === 'attachments' ? 'animate-fade-in' : 'hidden'}>
          <AttachmentsSection requisition={requisition} canEdit={canEditFiles} />
        </div>
      </CardBody>
    </Card>
  );
}
