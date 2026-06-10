import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Gauge,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Input,
  PageHeader,
  Spinner,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatRelative } from '@shared/utils';

import {
  useAsk,
  useBottlenecks,
  useDigest,
  useInsightsStatus,
} from '../hooks/useInsights';

const SUGGESTIONS = [
  'How many vacancies are there, and in which units?',
  'Which requisitions are stuck on approval, and on whom?',
  'Summarise the candidate pipeline.',
  'Top 5 departments by headcount.',
];

type Msg = { role: 'user' | 'ai'; text: string };

export default function InsightsPage() {
  const { data: status } = useInsightsStatus();
  const aiOff = status && !status.aiConfigured;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI HR Insights"
        description="Ask your HR data, get a weekly digest and spot pipeline bottlenecks."
      />

      {aiOff && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          AI isn&rsquo;t configured on the server, so insights are unavailable.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChatCard />
        </div>
        <div className="space-y-6">
          <DigestCard />
          <BottleneckCard />
        </div>
      </div>
    </div>
  );
}

function ChatCard() {
  const ask = useAsk();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, ask.isPending]);

  const send = (q: string) => {
    const question = q.trim();
    if (!question || ask.isPending) return;
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setInput('');
    ask.mutate(question, {
      onSuccess: (r) =>
        setMessages((m) => [...m, { role: 'ai', text: r.answer }]),
      onError: () =>
        setMessages((m) => [
          ...m,
          { role: 'ai', text: 'Sorry — I couldn’t answer that just now.' },
        ]),
    });
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600" />
          Ask your HR data
        </CardTitle>
      </CardHeader>
      <CardBody className="flex min-h-[24rem] flex-1 flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-6 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <Sparkles className="h-6 w-6" />
              </span>
              <p className="max-w-xs text-sm text-slate-500">
                Ask anything about your requisitions, candidates, organogram or
                workforce.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-3.5 py-2 text-sm text-white">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-2">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-50 px-3.5 py-2.5">
                    <AiText text={m.text} />
                  </div>
                </div>
              ),
            )
          )}
          {ask.isPending && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Spinner className="h-4 w-4" /> Thinking…
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mt-3 flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your HR data…"
            disabled={ask.isPending}
          />
          <Button
            type="submit"
            isLoading={ask.isPending}
            disabled={!input.trim()}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

function DigestCard() {
  const digest = useDigest();
  const data = digest.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-brand-600" />
          Weekly digest
        </CardTitle>
        {data && (
          <button
            type="button"
            onClick={() => digest.mutate()}
            className="text-xs font-medium text-slate-400 hover:text-brand-600"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
      </CardHeader>
      <CardBody>
        {!data ? (
          <div className="space-y-3 py-2 text-center">
            <p className="text-sm text-slate-500">
              An AI summary of this week&rsquo;s recruitment activity.
            </p>
            <Button
              size="sm"
              isLoading={digest.isPending}
              leftIcon={<Sparkles className="h-3.5 w-3.5" />}
              onClick={() => digest.mutate()}
            >
              Generate digest
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Stat label="New reqs" value={data.stats.newRequisitions} />
              <Stat label="New candidates" value={data.stats.newCandidates} />
            </div>
            <AiText text={data.summary} />
            <p className="text-[11px] text-slate-400">
              Generated {formatRelative(data.generatedAt)}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function BottleneckCard() {
  const bottlenecks = useBottlenecks();
  const data = bottlenecks.data;
  const m = data?.metrics;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-brand-600" />
          Bottlenecks & time-to-hire
        </CardTitle>
        {data && (
          <button
            type="button"
            onClick={() => bottlenecks.mutate()}
            className="text-xs font-medium text-slate-400 hover:text-brand-600"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
      </CardHeader>
      <CardBody>
        {!data || !m ? (
          <div className="space-y-3 py-2 text-center">
            <p className="text-sm text-slate-500">
              Where candidates drop off and what&rsquo;s slowing hiring down.
            </p>
            <Button
              size="sm"
              isLoading={bottlenecks.isPending}
              leftIcon={<Sparkles className="h-3.5 w-3.5" />}
              onClick={() => bottlenecks.mutate()}
            >
              Analyse
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Stat label="Open reqs" value={m.openRequisitions} />
              <Stat label="Avg days open" value={m.avgDaysOpen} />
              <Stat
                label="Avg time-to-fill"
                value={m.avgTimeToFillDays == null ? '—' : `${m.avgTimeToFillDays}d`}
              />
              <Stat label="Applied→Selected" value={`${m.conversion.appliedToSelectedPct}%`} />
            </div>

            {m.stuckRequisitions.length > 0 && (
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Stuck on approval
                </p>
                <ul className="space-y-1">
                  {m.stuckRequisitions.slice(0, 4).map((s) => (
                    <li key={s.code} className="text-xs text-slate-600">
                      <span className="font-medium">{s.code}</span> · {s.designation}
                      <span className="text-slate-400">
                        {' '}
                        — {s.daysWaiting}d on {s.waitingOn}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.summary && <AiText text={data.summary} />}
            <p className="text-[11px] text-slate-400">
              Generated {formatRelative(data.generatedAt)}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5">
      <p className="text-base font-bold leading-none text-ink-dark">{value}</p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  );
}

/** Safe markdown-lite: bold, bullets, line breaks. */
function AiText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-sm leading-6 text-slate-700">
      {lines.map((ln, i) => {
        const t = ln.trim();
        if (!t) return null;
        const bullet = /^[-•*]\s+/.test(t);
        const body = bullet ? t.replace(/^[-•*]\s+/, '') : t;
        return (
          <p key={i} className={cn(bullet && 'flex gap-2')}>
            {bullet && (
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
            )}
            <span dangerouslySetInnerHTML={{ __html: inlineBold(body) }} />
          </p>
        );
      })}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function inlineBold(s: string): string {
  return escapeHtml(s).replace(
    /\*\*(.+?)\*\*/g,
    '<strong class="font-semibold text-slate-900">$1</strong>',
  );
}
