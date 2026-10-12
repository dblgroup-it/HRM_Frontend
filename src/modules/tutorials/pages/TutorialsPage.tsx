import { ArrowUpRight, BookOpen, Download, FileText } from 'lucide-react';

import {
  EmptyState,
  ErrorCard,
  FullPageSpinner,
  PageHeader,
} from '@shared/components/ui';
import { resolveApiFileUrl } from '@shared/api';
import { cn } from '@shared/lib';

import { useTutorials } from '../hooks/useTutorials';
import type { Tutorial } from '../types/tutorials.types';

const size = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Tutorials — DBL HRM's client documentation: the System Workflow master
 * document and one guide per role. One click opens a guide as a PDF in a new
 * tab, through a signed link, so the guides stay behind the sign-in.
 */
export default function TutorialsPage() {
  const { data, isLoading, isError, refetch } = useTutorials();

  if (isLoading) return <FullPageSpinner label="Loading the guides…" />;
  if (isError || !data) {
    return <ErrorCard title="Could not load the guides" onRetry={() => void refetch()} />;
  }

  const master = data.guides.find((g) => g.slug === 'master');
  const guides = data.guides.filter((g) => g.slug !== 'master');
  const forYou = guides.filter((g) => g.forYou);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tutorials"
        description="Guides to DBL HRM — the full workflow, and one for each role. Click a guide to open it."
      />

      {!data.guides.length ? (
        <EmptyState
          title="No guides yet"
          description="The guides are not installed on this server. Ask the IT Department, DBL Group."
        />
      ) : (
        <>
          {master && <MasterCard guide={master} />}

          {forYou.length > 0 && (
            <Section title="For you" hint="Written for the roles you hold">
              {forYou.map((g) => (
                <GuideCard key={`you-${g.slug}`} guide={g} />
              ))}
            </Section>
          )}

          <Section title="All guides" hint={`${guides.length} guides, one for each part of the workflow`}>
            {guides.map((g) => (
              <GuideCard key={g.slug} guide={g} />
            ))}
          </Section>

          {data.version && (
            <p className="text-xs text-slate-400">
              Version {data.version}
              {data.date ? ` · ${data.date}` : ''} · Prepared by the IT Department, DBL Group
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

/** The whole card opens the guide; the download link sits above the stretched link. */
function GuideCard({ guide }: { guide: Tutorial }) {
  const open = resolveApiFileUrl(guide.url);
  return (
    <div className="group relative flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-brand-700">
          {guide.number}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
            {guide.kicker}
          </p>
          <a
            href={open}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 block text-[0.9375rem] font-semibold leading-snug text-slate-900 after:absolute after:inset-0 after:rounded-xl after:content-[''] focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand-300"
          >
            {guide.title}
          </a>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{guide.audience}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between pt-3 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          {guide.pages} pages · {size(guide.bytes)}
        </span>
        <span className="flex items-center gap-3">
          <a
            href={resolveApiFileUrl(guide.downloadUrl)}
            className="relative z-10 inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            title={`Download ${guide.title}`}
          >
            <Download className="h-3.5 w-3.5" /> Download
          </a>
          <span className="inline-flex items-center gap-0.5 font-medium text-brand-600 group-hover:text-brand-700">
            Open <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </span>
      </div>
    </div>
  );
}

function MasterCard({ guide }: { guide: Tutorial }) {
  const open = resolveApiFileUrl(guide.url);
  return (
    <div className="group relative flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-sm sm:flex-row sm:items-center">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-brand-700">
        <BookOpen className="h-7 w-7" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-brand-600">Start here</p>
        <a
          href={open}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 block text-lg font-semibold text-slate-900 after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand-300"
        >
          {guide.title}
        </a>
        <p className="mt-1 text-sm text-slate-500">{guide.subtitle}</p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400">
          <FileText className="h-3.5 w-3.5" />
          {guide.pages} pages · {size(guide.bytes)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a
          href={resolveApiFileUrl(guide.downloadUrl)}
          className="relative z-10 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" /> Download
        </a>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white',
            'group-hover:bg-brand-700',
          )}
        >
          Open <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}
