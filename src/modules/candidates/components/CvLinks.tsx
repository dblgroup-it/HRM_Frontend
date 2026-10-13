import type { ReactNode } from 'react';
import { FileText, FileUser } from 'lucide-react';

import { resolveApiFileUrl } from '@shared/api';
import { cn } from '@shared/lib';

/**
 * A candidate's CV links, the same on every screen that offers one.
 *
 * A BDJobs applicant can have two — "Personal CV" (the CV they attached) and
 * "BDJobs CV" (their application as a PDF) — and every role sees both, as the
 * recruiter's row does. Anyone else has one, labelled as the screen always
 * labelled it. Each screen keeps its own look through `className`.
 *
 * Renders the links only (no wrapper), so it drops into whatever row, cell or
 * card the screen already has. Nothing at all when there is no CV.
 */
export function CvLinks({
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
  /** Classes for each link. */
  className: string;
  /** What a lone CV is called on this screen — "View CV", "CV", "Full CV". */
  label?: string;
  iconClassName?: string;
  /** After the label, e.g. an external-link glyph. */
  trailing?: ReactNode;
  /** e.g. `hidden sm:inline` where the screen shows icons only on a phone. */
  labelClassName?: string;
  /** Inside a clickable row, so opening the CV does not also open the row. */
  stopPropagation?: boolean;
  draggable?: boolean;
}) {
  const bdjobs = profileCvSource === 'bdjobs';
  const links = [
    cvUrl
      ? { key: 'personal', href: cvUrl, icon: FileText, text: bdjobs ? 'Personal CV' : label }
      : null,
    profileCvUrl
      ? { key: 'bdjobs', href: profileCvUrl, icon: bdjobs ? FileUser : FileText, text: bdjobs ? 'BDJobs CV' : label }
      : null,
  ].filter((l): l is NonNullable<typeof l> => l !== null);

  return (
    <>
      {links.map(({ key, href, icon: Icon, text }) => (
        <a
          key={key}
          href={resolveApiFileUrl(href)}
          target="_blank"
          rel="noreferrer"
          draggable={draggable}
          title={
            key === 'bdjobs' && bdjobs
              ? 'The BDJobs application as a CV — opens as a PDF'
              : bdjobs
                ? 'The CV the candidate attached on BDJobs'
                : undefined
          }
          onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
          className={className}
        >
          <Icon className={cn('shrink-0', iconClassName)} />
          <span className={labelClassName}>{text}</span>
          {trailing}
        </a>
      ))}
    </>
  );
}
