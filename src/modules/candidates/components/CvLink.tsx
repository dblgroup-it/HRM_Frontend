import type { ReactNode } from 'react';
import { FileText, FileUser } from 'lucide-react';

import { resolveApiFileUrl } from '@shared/api';
import { cn } from '@shared/lib';

/**
 * A candidate's CV — one link, the same rule on every screen.
 *
 * The candidate's own CV comes first; their BDJobs CV (the application as a
 * PDF) is offered only when they have none (owner's decision, 2026-10-14 —
 * two buttons side by side was noise). The server already sends no BDJobs
 * link when there is a personal CV; this picks the same way regardless.
 *
 * For a BDJobs applicant the link says which CV it is — "Personal CV" or
 * "BDJobs CV"; anyone else keeps the screen's usual label. Each screen keeps
 * its own look through `className`. Nothing at all when there is no CV.
 */
export function CvLink({
  cvUrl,
  profileCvUrl,
  profileCvSource,
  className,
  label = 'View CV',
  iconClassName = 'h-3 w-3',
  trailing,
  labelClassName,
  stopPropagation = false,
  draggable,
}: {
  cvUrl?: string | null;
  profileCvUrl?: string | null;
  profileCvSource?: string | null;
  className: string;
  /** What a CV is called on this screen — "View CV", "CV", "Full CV". */
  label?: string;
  iconClassName?: string;
  /** After the label, e.g. an external-link glyph. */
  trailing?: ReactNode;
  /** e.g. `hidden sm:inline` where the screen shows an icon only on a phone. */
  labelClassName?: string;
  /** Inside a clickable row, so opening the CV does not also open the row. */
  stopPropagation?: boolean;
  draggable?: boolean;
}) {
  const href = cvUrl || profileCvUrl;
  if (!href) return null;
  const bdjobs = profileCvSource === 'bdjobs';
  const personal = Boolean(cvUrl);
  const Icon = !personal && bdjobs ? FileUser : FileText;
  const text = !bdjobs ? label : personal ? 'Personal CV' : 'BDJobs CV';

  return (
    <a
      href={resolveApiFileUrl(href)}
      target="_blank"
      rel="noreferrer"
      draggable={draggable}
      title={
        !bdjobs
          ? undefined
          : personal
            ? 'The CV the candidate attached on BDJobs'
            : 'The BDJobs application as a CV — opens as a PDF'
      }
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      className={className}
    >
      <Icon className={cn('shrink-0', iconClassName)} />
      <span className={labelClassName}>{text}</span>
      {trailing}
    </a>
  );
}
