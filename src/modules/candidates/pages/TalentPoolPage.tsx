import { useEffect, useRef, useState } from 'react';
import {
  BrainCircuit,
  Calendar,
  ChevronRight,
  FileText,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  FullPageSpinner,
  Modal,
  PageHeader,
  Portal
} from '@shared/components/ui';
import { useMyPermissions } from '@modules/rbac';
import { useRequisitions } from '@modules/requisition';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';

import {
  useCopyToRequisition,
  useTalentBankSearch,
  useTalentPool,
  useToggleTalentPool,
} from '../hooks/useCandidates';
import { canViewCandidatePipeline } from '../access';
import type { TalentBankSearchHit, TalentPoolCandidate } from '../types/candidate.types';
import { resolveApiFileUrl } from '@shared/api';

/* ─── constants ─── */
const STAGE: Record<string, { label: string; tone: 'success' | 'brand' | 'warning' | 'neutral' }> = {
  selected:  { label: 'Selected',     tone: 'success'  },
  final:     { label: 'Finalist',     tone: 'brand'    },
  interview: { label: 'Interviewed',  tone: 'warning'  },
};

const AI_SUGGESTIONS = [
  'Textile engineer for JTML',
  'QC specialist with 3+ years',
  'HR manager, Head Office',
  'Production executive, factory',
];

const ANIM = `
@keyframes tbRowIn {
  from { opacity:0; transform:translateY(6px); }
  to   { opacity:1; transform:translateY(0);   }
}
@keyframes tbFade {
  from { opacity:0; }
  to   { opacity:1; }
}
@keyframes tbRipple {
  0%   { transform:scale(0.9); opacity:.7; }
  100% { transform:scale(2.4); opacity:0;  }
}
@keyframes tbBounce {
  0%,100% { transform:translateY(0);    }
  50%     { transform:translateY(-7px); }
}
@keyframes tbPhase {
  from { opacity:0; transform:translateY(5px); }
  to   { opacity:1; transform:translateY(0);   }
}
`;

/* ─── Full-screen AI overlay ─── */
function AiOverlay({ query, total }: { query: string; total: number }) {
  const [phase, setPhase] = useState(0);
  const labels = ['Analyzing your query…', 'Scanning candidate profiles…', 'Ranking best matches…'];
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 900);
    const t2 = setTimeout(() => setPhase(2), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8"
      style={{ background: 'rgba(248,250,252,0.97)', backdropFilter: 'blur(12px)' }}>
      {/* Ripple rings + icon */}
      <div className="relative flex h-28 w-28 items-center justify-center">
        {[0, 1, 2].map((i) => (
          <span key={i} className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(135deg,rgba(124,58,237,.15),rgba(24,119,192,.15))',
              animation: `tbRipple 2.2s ease-out infinite`,
              animationDelay: `${i * 0.7}s`,
            }} />
        ))}
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl shadow-xl"
          style={{ background: 'linear-gradient(135deg,#7c3aed 0%,#1877c0 100%)', boxShadow: '0 8px 32px rgba(124,58,237,.3)' }}>
          <BrainCircuit className="h-7 w-7 text-white" />
        </div>
      </div>

      {/* Bouncing dots */}
      <div className="flex items-end gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="h-2 w-2 rounded-full"
            style={{
              background: `linear-gradient(135deg,#7c3aed,#1877c0)`,
              animation: `tbBounce 1.1s ease-in-out infinite`,
              animationDelay: `${i * 0.12}s`,
            }} />
        ))}
      </div>

      <div className="text-center">
        <p key={phase} className="text-[1.0625rem] font-semibold text-slate-800"
          style={{ animation: 'tbPhase .35s ease both' }}>
          {labels[phase]}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Reviewing <span className="font-medium text-slate-600">{total}</span> profiles in the Talent Bank
        </p>
      </div>

      <div className="flex items-center gap-2.5 rounded-2xl border border-purple-200 bg-white px-5 py-2.5 shadow-sm">
        <Sparkles className="h-4 w-4 text-purple-500" />
        <span className="text-[0.8125rem] font-medium text-purple-700">"{query}"</span>
      </div>
    </div>
    </Portal>
  );
}

/* ─── Add-to-req modal ─── */
function AddToReqModal({ candidate, onClose }: { candidate: TalentPoolCandidate; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const copy = useCopyToRequisition();
  const { data: posted }   = useRequisitions({ status: 'posted',   pageSize: 80 });
  const { data: approved } = useRequisitions({ status: 'approved', pageSize: 80 });

  const all = [...(posted?.items ?? []), ...(approved?.items ?? [])];
  const cDesig = candidate.requisition.designation.toLowerCase();
  const q = search.toLowerCase();
  const filtered = all
    .filter((r) => !q || [r.designation, r.unitFactory, r.department, r.code].some((f) => f?.toLowerCase().includes(q)))
    .sort((a, b) =>
      (a.designation.toLowerCase().includes(cDesig) ? 0 : 1) -
      (b.designation.toLowerCase().includes(cDesig) ? 0 : 1),
    );

  return (
    <Modal open onClose={onClose} title="Add to Requisition Pipeline" size="md">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          A copy of <span className="font-semibold text-slate-700">{candidate.name}</span>'s profile
          will be added to the selected requisition's applicant pool.
        </p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by role, unit or code…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </div>

        <div className="max-h-60 space-y-2 overflow-y-auto pr-0.5">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">No open requisitions.</p>
          )}
          {filtered.map((r) => {
            const match = r.designation.toLowerCase().includes(cDesig);
            return (
              <button key={r.id} type="button" onClick={() => setSelected(r.id)}
                className={cn(
                  'w-full rounded-xl border p-3.5 text-left transition-all',
                  selected === r.id
                    ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-100'
                    : 'border-slate-200 hover:border-brand-200 hover:bg-slate-50',
                )}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[0.8125rem] font-semibold text-slate-800">{r.designation}</span>
                      {match && (
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[0.625rem] font-bold text-emerald-700">
                          Role match
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[0.6875rem] text-slate-500">{r.code} · {r.unitFactory} · {r.department}</p>
                  </div>
                  <Badge tone={r.status === 'posted' ? 'success' : 'brand'}>
                    {r.status === 'posted' ? 'Posted' : 'Approved'}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" disabled={!selected || copy.isPending}
            isLoading={copy.isPending}
            onClick={() => { if (selected) copy.mutate({ id: candidate.id, requisitionId: selected }, { onSuccess: onClose }); }}>
            Add to Pipeline
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Column layout token (shared between header + rows) ─── */
// avatar: w-10, candidate: flex-1, unit: w-44, stage: w-28, date: w-32, actions: auto

/* ─── Single candidate row ─── */
function CandidateRow({
  candidate: c,
  index,
  isAiResult,
  onAddToReq,
  onRemove,
}: {
  candidate: TalentPoolCandidate | TalentBankSearchHit;
  index: number;
  isAiResult: boolean;
  onAddToReq: () => void;
  onRemove: () => void;
}) {
  const hit  = isAiResult ? (c as TalentBankSearchHit) : null;
  const meta = STAGE[c.stage] ?? { label: c.stage, tone: 'neutral' as const };

  const relPalette = hit
    ? hit.relevance >= 80 ? { bg: '#f0fdf4', border: '#bbf7d0', text: '#065f46' }
      : hit.relevance >= 60 ? { bg: '#fffbeb', border: '#fde68a', text: '#78350f' }
      : { bg: '#f8fafc', border: '#e2e8f0', text: '#475569' }
    : null;

  const scorePalette = c.matchScore !== null
    ? c.matchScore >= 80 ? { bg: '#f0fdf4', border: '#bbf7d0', text: '#065f46' }
      : c.matchScore >= 60 ? { bg: '#fffbeb', border: '#fde68a', text: '#78350f' }
      : { bg: '#f8fafc', border: '#e2e8f0', text: '#475569' }
    : null;

  return (
    <div
      className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-slate-50/80"
      style={{ animation: 'tbRowIn .4s ease both', animationDelay: `${Math.min(index * 40, 480)}ms` }}
    >
      {/* Col 1 — avatar (w-10) */}
      <div className="w-10 shrink-0">
        <Avatar name={c.name} size="md" />
      </div>

      {/* Col 2 — candidate (flex-1) */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[0.8125rem] font-semibold text-slate-800 leading-snug">{c.name}</span>
          {hit && relPalette && (
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold"
              style={{ background: relPalette.bg, borderColor: relPalette.border, color: relPalette.text }}>
              <BrainCircuit className="h-2.5 w-2.5" />{hit.relevance}% AI
            </span>
          )}
          {scorePalette && !hit && (
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold"
              style={{ background: scorePalette.bg, borderColor: scorePalette.border, color: scorePalette.text }}>
              <Sparkles className="h-2.5 w-2.5" />{c.matchScore}%
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[0.6875rem] text-slate-500 truncate">{c.requisition.designation}</p>
        {hit?.reason && (
          <p className="mt-1 text-[0.65625rem] leading-relaxed text-purple-600">{hit.reason}</p>
        )}
        {/* Mobile-only meta */}
        <p className="mt-1 text-[0.625rem] text-slate-400 sm:hidden">
          {c.requisition.unit} · {c.requisition.code} · {formatDate(c.createdAt)}
        </p>
      </div>

      {/* Col 3 — unit / dept (w-44, hidden mobile) */}
      <div className="hidden w-44 shrink-0 sm:block">
        <p className="truncate text-[0.75rem] font-medium text-slate-700">{c.requisition.unit}</p>
        <p className="truncate text-[0.6875rem] text-slate-400">{c.requisition.department || '—'}</p>
      </div>

      {/* Col 4 — stage (w-28) */}
      <div className="w-28 shrink-0">
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>

      {/* Col 5 — applied date (w-32, hidden below lg) */}
      <div className="hidden w-32 shrink-0 lg:block">
        <div className="flex items-center gap-1 text-[0.6875rem] text-slate-500">
          <Calendar className="h-3 w-3 shrink-0 text-slate-300" />
          {formatDate(c.createdAt)}
        </div>
        <p className="mt-0.5 text-[0.625rem] text-slate-400">{c.requisition.code}</p>
      </div>

      {/* Col 6 — actions */}
      <div className="flex shrink-0 items-center gap-2">
        {/* View CV — icon-only on mobile, icon+text on sm+ */}
        {c.cvUrl ? (
          <a href={resolveApiFileUrl(c.cvUrl)} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-[0.6875rem] font-medium text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 sm:px-2.5">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">View CV</span>
          </a>
        ) : (
          <span className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-200 px-2 py-1.5 text-[0.6875rem] text-slate-300 sm:px-2.5">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">No CV</span>
          </span>
        )}

        {/* Add to req */}
        <button type="button" onClick={onAddToReq}
          className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2 py-1.5 text-[0.6875rem] font-medium text-brand-700 transition-colors hover:bg-brand-100 sm:px-2.5">
          <Plus className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Add to Req</span>
        </button>

        {/* Remove from bank */}
        <button type="button" onClick={onRemove} title="Remove from Talent Bank"
          className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[0.6875rem] font-medium text-red-500 transition-colors hover:bg-red-100 sm:px-2.5">
          <Trash2 className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Remove</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function TalentPoolPage() {
  const { data: perms, isLoading: permsLoading } = useMyPermissions();
  const { data = [], isLoading } = useTalentPool();
  const toggle   = useToggleTalentPool();
  const aiSearch = useTalentBankSearch();

  const [aiQuery,      setAiQuery]      = useState('');
  const [stageFilter,  setStageFilter]  = useState('all');
  const [addCandidate, setAddCandidate] = useState<TalentPoolCandidate | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showAiResults = aiSearch.isSuccess;

  if (isLoading || permsLoading) return <FullPageSpinner label="Loading Talent Bank…" />;

  if (!canViewCandidatePipeline(perms)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Talent Bank" />
        <EmptyState icon={<ShieldAlert className="h-6 w-6" />}
          title="Access restricted"
          description="Talent Bank is available to Head of Talent Acquisition, CHRO and super users only." />
      </div>
    );
  }

  const counts = {
    all:       data.length,
    selected:  data.filter((c) => c.stage === 'selected').length,
    final:     data.filter((c) => c.stage === 'final').length,
    interview: data.filter((c) => c.stage === 'interview').length,
  };

  const FILTER_TABS = [
    { key: 'all',       label: 'All',         count: counts.all },
    { key: 'selected',  label: 'Selected',    count: counts.selected },
    { key: 'final',     label: 'Finalist',    count: counts.final },
    { key: 'interview', label: 'Interviewed', count: counts.interview },
  ];

  const runSearch = () => {
    const q = aiQuery.trim();
    if (!q || aiSearch.isPending) return;
    aiSearch.mutate(q);
  };

  const clearSearch = () => { aiSearch.reset(); setAiQuery(''); };

  const displayList = showAiResults
    ? (aiSearch.data?.results ?? [])
    : data.filter((c) => stageFilter === 'all' || c.stage === stageFilter);

  return (
    <>
      <style>{ANIM}</style>
      {aiSearch.isPending && <AiOverlay query={aiQuery} total={data.length} />}
      {addCandidate && <AddToReqModal candidate={addCandidate} onClose={() => setAddCandidate(null)} />}

      <div className="space-y-5">
        <PageHeader
          title="Talent Bank"
          description={`${data.length} curated candidate${data.length !== 1 ? 's' : ''} — automatically collected from every requisition pipeline.`}
        />

        {/* ── AI Search panel ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Panel header */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5"
            style={{ background: 'linear-gradient(to right, #faf5ff, #eff6ff, #ffffff)' }}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#1877c0)' }}>
              <BrainCircuit className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[0.8125rem] font-semibold text-slate-800">AI Smart Search</p>
              <p className="text-[0.6875rem] text-slate-500">Describe who you need — AI finds the best matches from the bank</p>
            </div>
            {showAiResults && (
              <button type="button" onClick={clearSearch}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-[0.6875rem] font-medium text-slate-500 hover:bg-slate-50">
                <X className="h-3.5 w-3.5" />
                Clear results
              </button>
            )}
          </div>

          {/* Input area */}
          {!showAiResults ? (
            <div className="px-5 py-4">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runSearch(); } }}
                  placeholder="e.g.  I need a textile engineer for JTML with at least 3 years of QC experience…"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 pr-32 text-sm text-slate-800 placeholder:text-slate-400 transition-all focus:border-purple-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-100"
                />
                <button
                  type="button"
                  onClick={runSearch}
                  disabled={!aiQuery.trim() || aiSearch.isPending}
                  className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[0.75rem] font-semibold text-white shadow-sm transition-all hover:scale-[1.03] disabled:scale-100 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#1877c0)' }}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Search
                </button>
              </div>

              {/* Suggestions */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[0.6875rem] text-slate-400">Try:</span>
                {AI_SUGGESTIONS.map((s) => (
                  <button key={s} type="button"
                    onClick={() => { setAiQuery(s); textareaRef.current?.focus(); }}
                    className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[0.6875rem] text-slate-500 transition-colors hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700">
                    <ChevronRight className="h-3 w-3" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Result summary bar */
            <div className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-[0.8125rem] font-semibold text-slate-800">
                  {displayList.length} match{displayList.length !== 1 ? 'es' : ''} found
                </span>
              </div>
              {aiSearch.data?.summary && (
                <p className="text-[0.75rem] text-slate-500">{aiSearch.data.summary}</p>
              )}
              <div className="ml-auto flex items-center gap-1.5 rounded-xl border border-purple-100 bg-purple-50 px-3 py-1.5">
                <BrainCircuit className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-[0.6875rem] font-medium text-purple-700">"{aiSearch.data?.query}"</span>
              </div>
            </div>
          )}
        </div>

        {data.length === 0 ? (
          <EmptyState icon={<BrainCircuit className="h-7 w-7 text-slate-300" />}
            title="Talent Bank is empty"
            description="Candidates who reach Finalist or Selected stage are added here automatically." />
        ) : (
          <>
            {/* ── Filter tabs (only when not in AI results) ── */}
            {!showAiResults && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {FILTER_TABS.map((tab) => (
                  <button key={tab.key} type="button" onClick={() => setStageFilter(tab.key)}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[0.75rem] font-semibold transition-all duration-200',
                      stageFilter === tab.key
                        ? 'bg-brand-600 text-white shadow-sm shadow-brand-200/50'
                        : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700',
                    )}>
                    {tab.label}
                    <span className={cn(
                      'rounded-full px-1.5 py-0.5 text-[0.625rem] font-bold',
                      stageFilter === tab.key ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500',
                    )}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* ── List ── */}
            {displayList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                <p className="text-sm text-slate-400">
                  {showAiResults ? 'No candidates matched — try rephrasing your query.' : 'No candidates in this stage.'}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                {/* List header — column widths mirror CandidateRow exactly */}
                <div className="hidden items-center gap-4 border-b border-slate-100 bg-slate-50/80 px-5 py-2.5 text-[0.625rem] font-semibold uppercase tracking-wider text-slate-400 sm:flex">
                  <span className="w-10 shrink-0" />
                  <span className="flex-1">Candidate</span>
                  <span className="w-44 shrink-0">Unit / Department</span>
                  <span className="w-28 shrink-0">Stage</span>
                  <span className="hidden w-32 shrink-0 lg:block">Applied</span>
                  <span className="shrink-0">Actions</span>
                </div>

                <div className="divide-y divide-slate-50">
                  {displayList.map((c, i) => (
                    <CandidateRow
                      key={c.id}
                      candidate={c}
                      index={i}
                      isAiResult={showAiResults}
                      onAddToReq={() => setAddCandidate(c as TalentPoolCandidate)}
                      onRemove={() => toggle.mutate({ id: c.id, talentPool: false })}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
