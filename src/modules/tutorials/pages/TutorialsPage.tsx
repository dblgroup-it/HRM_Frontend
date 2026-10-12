import { ArrowUpRight, Download, FileText } from 'lucide-react';

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

/** The order sections read in, following the hiring lifecycle. */
const GROUP_ORDER = [
  'Overview',
  'Requisition',
  'Approvals',
  'Recruitment & interviews',
  'Onboarding',
  'Administration',
];

const size = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Tutorials — the client documentation, role by role.
 *
 * Each person sees the guides for the roles they hold (the server decides,
 * and signs links for those alone); super users and the admin see every
 * guide. One click opens a guide as a PDF in a new tab.
 */
export default function TutorialsPage() {
  const { data, isLoading, isError, refetch } = useTutorials();

  if (isLoading) return <FullPageSpinner label="Loading your guides…" />;
  if (isError || !data) {
    return <ErrorCard title="Could not load the guides" onRetry={() => void refetch()} />;
  }

  const all = data.scope === 'all';
  const master = data.guides.find((g) => g.slug === 'master');
  const rest = data.guides.filter((g) => g.slug !== 'master');
  // One guide and nothing else: give it the whole width.
  const featured = master ?? (rest.length === 1 ? rest[0] : undefined);
  const listed = featured === master ? rest : [];
  // A handful of guides reads best together; the whole set reads best by area.
  const grouped = listed.length > 4;
  const groups = grouped
    ? [...new Set([...GROUP_ORDER, ...listed.map((g) => g.group)])]
        .map((name) => ({ name, guides: listed.filter((g) => g.group === name) }))
        .filter((s) => s.guides.length)
    : listed.length
      ? [{ name: master ? 'More for your role' : 'Your guides', guides: listed }]
      : [];

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <PageHeader
          title="Tutorials"
          description={
            all
              ? 'Every guide to DBL HRM — as an administrator you see the whole set. Click a guide to open it.'
              : 'The guides written for your role in DBL HRM. Click a guide to open it.'
          }
        />
        {data.roles.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-medium text-slate-400">
              {data.roles.length > 1 ? 'Your roles' : 'Your role'}
            </span>
            {data.roles.map((r) => (
              <span
                key={r.key}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                {r.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {!data.guides.length ? (
        <EmptyState
          title="No guide for your role yet"
          description="Guides are written for each role in the hiring workflow. Ask the IT Department, DBL Group, if you need one."
        />
      ) : (
        <>
          {featured && <FeaturedGuide guide={featured} lead={featured === master ? 'Start here' : 'Your guide'} />}

          {groups.map((s) => (
            <section key={s.name} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-800">{s.name}</h2>
                {grouped && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-medium text-slate-500">
                    {s.guides.length}
                  </span>
                )}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {s.guides.map((g) => (
                  <GuideCard key={g.slug} guide={g} />
                ))}
              </div>
            </section>
          ))}

          {data.version && (
            <p className="border-t border-slate-100 pt-4 text-xs text-slate-400">
              Version {data.version}
              {data.date ? ` · ${data.date}` : ''} · Prepared by the IT Department, DBL Group
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** The cover, or a quiet stand-in when a build has none. Never stretched to the card's height — it would crop sideways. */
function Cover({ guide, className }: { guide: Tutorial; className: string }) {
  return (
    <div
      className={cn(
        'relative shrink-0 self-start overflow-hidden rounded-md bg-white shadow-[0_1px_3px_rgba(15,23,42,0.12)] ring-1 ring-slate-200 transition-transform duration-300 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:shadow-[0_8px_18px_-8px_rgba(15,23,42,0.28)]',
        className,
      )}
    >
      {guide.thumbUrl ? (
        <img
          src={resolveApiFileUrl(guide.thumbUrl)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-50">
          <FileText className="h-6 w-6 text-slate-300" />
        </div>
      )}
    </div>
  );
}

function Meta({ guide }: { guide: Tutorial }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
      <FileText className="h-3.5 w-3.5" />
      {guide.pages} pages
      <span className="text-slate-300">·</span>
      {size(guide.bytes)}
      <span className="text-slate-300">·</span>
      PDF
    </span>
  );
}

/** The whole card opens the guide; Download sits above the stretched link. */
function GuideCard({ guide }: { guide: Tutorial }) {
  return (
    <div className="group relative flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 sm:p-5">
      <Cover guide={guide} className="aspect-[210/297] w-[76px] sm:w-[92px]" />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-slate-400">
          {guide.kicker}
        </p>
        <a
          href={resolveApiFileUrl(guide.url)}
          target="_blank"
          rel="noopener noreferrer"
          title="Opens in a new tab"
          className="mt-1 text-[0.9375rem] font-semibold leading-snug text-slate-900 after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand-300"
        >
          {guide.title}
        </a>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500">{guide.subtitle}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <Meta guide={guide} />
          <div className="flex items-center gap-1">
            <a
              href={resolveApiFileUrl(guide.downloadUrl)}
              className="relative z-10 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              title={`Download ${guide.title}`}
            >
              <Download className="h-3.5 w-3.5" /> Download
            </a>
            <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-600 transition-colors group-hover:bg-brand-50 group-hover:text-brand-700">
              Open <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturedGuide({ guide, lead }: { guide: Tutorial; lead: string }) {
  return (
    <div className="group relative flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300 sm:p-6 xl:flex-row xl:items-stretch">
      <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-start">
        <Cover guide={guide} className="aspect-[210/297] w-[112px] sm:w-[136px] xl:w-[160px]" />
        <div className="min-w-0 flex-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-brand-600">{lead}</p>
          <p className="mt-1 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-slate-400">
            {guide.kicker}
          </p>
          <a
            href={resolveApiFileUrl(guide.url)}
            target="_blank"
            rel="noopener noreferrer"
            title="Opens in a new tab"
            className="mt-1 block text-xl font-semibold tracking-tight text-slate-900 after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand-300"
          >
            {guide.title}
          </a>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">{guide.subtitle}</p>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">For: {guide.audience}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors group-hover:bg-brand-700">
              Open guide <ArrowUpRight className="h-4 w-4" />
            </span>
            <a
              href={resolveApiFileUrl(guide.downloadUrl)}
              className="relative z-10 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <Download className="h-4 w-4" /> Download
            </a>
            <Meta guide={guide} />
          </div>
        </div>
      </div>

      {guide.contents.length > 0 && (
        <div className="rounded-xl bg-slate-50 px-4 py-3.5 xl:w-[22rem] xl:shrink-0">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-slate-400">
            Inside this guide
          </p>
          <ol className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2 xl:grid-cols-1">
            {guide.contents.map((c, i) => (
              <li key={c} className="flex gap-2 text-[0.8125rem] leading-6 text-slate-600">
                <span className="w-4 shrink-0 text-right font-semibold tabular-nums text-slate-400">
                  {i + 1}
                </span>
                <span className="min-w-0 truncate" title={c}>
                  {c}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
