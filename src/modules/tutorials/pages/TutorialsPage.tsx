import { BookOpen, SearchX } from 'lucide-react';
import { useState } from 'react';

import { useAuthStore } from '@modules/auth';
import { EmptyState, ErrorCard, FullPageSpinner } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { firstName } from '@shared/utils';

import { FeaturedGuide } from '../components/FeaturedGuide';
import { GuideCard } from '../components/GuideCard';
import { TutorialsHero } from '../components/TutorialsHero';
import { useOpenedGuides } from '../hooks/useOpenedGuides';
import { useTutorials } from '../hooks/useTutorials';
import { STAGES, toneOf } from '../tones';
import type { Tutorial } from '../types/tutorials.types';
import { greeting, matchesQuery, readingTime } from '../utils';

/**
 * Tutorials — the client documentation as a learning hub, role by role.
 *
 * Each person sees the guides for the roles they hold (the server decides,
 * and signs links for those alone); super users and the admin see every
 * guide. The guide to start with is shown large, the rest as cards tinted by
 * the stage of the hiring workflow they cover. Search reaches every chapter,
 * the journey filters by stage, and a chapter opens the PDF at its page.
 */
export default function TutorialsPage() {
  const { data, isLoading, isError, refetch } = useTutorials();
  const name = useAuthStore((s) => s.user?.name);
  const { opened, markOpened } = useOpenedGuides();
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<string | null>(null);

  if (isLoading) return <FullPageSpinner label="Loading your guides…" />;
  if (isError || !data) {
    return <ErrorCard title="Could not load the guides" onRetry={() => void refetch()} />;
  }

  const guides = data.guides;
  const master = guides.find((g) => g.slug === 'master');
  const rest = guides.filter((g) => g.slug !== 'master');
  // The master leads for those who have it; a single guide leads on its own.
  const featured = master ?? (rest.length === 1 ? rest[0] : undefined);
  const listed = featured === master ? rest : [];

  const counts = Object.fromEntries(STAGES.map((s) => [s, guides.filter((g) => g.group === s).length]));
  // Filtering by stage only means something when the cards span two stages or more.
  const canFilter = new Set(listed.map((g) => g.group)).size > 1;
  const searching = query.trim().length > 0;

  const showFeatured = featured && matchesQuery(featured, query) && (!stage || featured.group === stage);
  const shown = listed.filter((g) => (!stage || g.group === stage) && matchesQuery(g, query));
  // The whole set reads best by stage; a handful reads best together.
  const grouped = !stage && !searching && shown.length > 4;
  const sections = grouped
    ? [...new Set([...STAGES, ...shown.map((g) => g.group)])]
        .map((s) => ({ name: s, tinted: true, guides: shown.filter((g) => g.group === s) }))
        .filter((s) => s.guides.length)
    : shown.length
      ? [
          {
            name: stage ?? (searching ? 'Matching guides' : master ? 'More for your role' : 'Your guides'),
            tinted: Boolean(stage),
            guides: shown,
          },
        ]
      : [];
  const nothingFound = searching && !showFeatured && !shown.length;

  const totalPages = guides.reduce((n, g) => n + g.pages, 0);
  const intro =
    data.scope === 'all'
      ? 'As an administrator you see every guide to DBL HRM.'
      : guides.length === 0
        ? 'There is no guide for your role yet.'
        : guides.length === 1
          ? 'Here is the guide written for your role.'
          : 'Here are the guides written for your roles.';

  const open = (g: Tutorial) => () => markOpened(g.slug);
  let order = 0;

  return (
    <div className="space-y-7">
      <TutorialsHero
        greeting={`${greeting()}${name ? `, ${firstName(name)}` : ''}.`}
        intro={intro}
        roles={data.roles}
        stats={
          guides.length
            ? {
                guides: guides.length,
                pages: totalPages,
                readingTime: readingTime(totalPages),
                opened: guides.filter((g) => opened[g.slug]).length,
              }
            : null
        }
        query={query}
        onQuery={setQuery}
        counts={counts}
        stage={stage}
        onStage={canFilter ? setStage : null}
      />

      {!guides.length ? (
        <EmptyState
          title="No guide for your role yet"
          description="Guides are written for each role in the hiring workflow. Ask the IT Department, DBL Group, if you need one."
        />
      ) : (
        <>
          {showFeatured && (
            <FeaturedGuide
              guide={featured}
              lead={featured === master ? 'Start here' : 'Your guide'}
              opened={Boolean(opened[featured.slug])}
              onOpen={open(featured)}
              query={query}
            />
          )}

          {/* Keyed on the stage, so choosing one plays the cards in afresh. */}
          <div key={stage ?? 'all'} className="space-y-7">
            {sections.map((s) => (
              <section key={s.name} className="space-y-3">
                <div className="flex items-center gap-2.5">
                  {s.tinted && <span className={cn('h-2.5 w-2.5 rounded-full', toneOf(s.name).dot)} />}
                  <h2 className="text-sm font-semibold text-slate-800">{s.name}</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-medium tabular-nums text-slate-500">
                    {s.guides.length}
                  </span>
                  {stage && (
                    <button
                      type="button"
                      onClick={() => setStage(null)}
                      className="ml-auto text-xs font-medium text-brand-700 hover:underline"
                    >
                      Show all guides
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                  {s.guides.map((g) => (
                    <GuideCard
                      key={g.slug}
                      guide={g}
                      order={order++}
                      opened={Boolean(opened[g.slug])}
                      onOpen={open(g)}
                      query={query}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {nothingFound && (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-200 px-6 py-12 text-center motion-safe:animate-card-in">
              <SearchX className="h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">No guide or chapter matches “{query.trim()}”</p>
              <p className="mt-1 text-sm text-slate-500">Try another word — a screen, a step or a role.</p>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Clear search
              </button>
            </div>
          )}

          {data.version && (
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 pt-1 text-xs text-slate-400">
              <BookOpen className="h-3.5 w-3.5" />
              Version {data.version}
              {data.date ? ` · ${data.date}` : ''} · Prepared by the IT Department, DBL Group
            </p>
          )}
        </>
      )}
    </div>
  );
}
