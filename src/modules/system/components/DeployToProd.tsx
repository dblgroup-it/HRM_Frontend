import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  GitCommitHorizontal,
  Loader2,
  Rocket,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button, Input, Spinner } from '@shared/components/ui';
import { cn } from '@shared/lib';

import type { PromoteRun, RepoPlan } from '../api/system.api';
import { usePromoteStatus, useStartPromote } from '../hooks/useSystem';

const RUN_META: Record<PromoteRun['status'], { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  running: { label: 'Deploying…', tone: 'bg-brand-50 text-brand-800 ring-brand-200', icon: Loader2 },
  rolling_back: { label: 'Failed — rolling back…', tone: 'bg-amber-50 text-amber-800 ring-amber-200', icon: Loader2 },
  success: { label: 'Live', tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200', icon: CheckCircle2 },
  nothing: { label: 'Nothing to deploy', tone: 'bg-slate-50 text-slate-700 ring-slate-200', icon: CheckCircle2 },
  failed: { label: 'Stopped before deploying', tone: 'bg-rose-50 text-rose-800 ring-rose-200', icon: XCircle },
  rolled_back: { label: 'Failed — previous release restored', tone: 'bg-amber-50 text-amber-800 ring-amber-200', icon: RotateCcw },
  rollback_failed: { label: 'Failed and could not roll back — act now', tone: 'bg-rose-100 text-rose-900 ring-rose-300', icon: AlertTriangle },
};

/**
 * Put what this dev server runs onto the live site — the ADMIN login only.
 *
 * Shows exactly which commits would go live before anything is pressed, asks
 * for DEPLOY to be typed, then streams the deploy log. The server script
 * decides everything else, including rolling back a failed deploy.
 */
export function DeployToProd() {
  const status = usePromoteStatus(true);
  const start = useStartPromote();
  const [typed, setTyped] = useState('');
  const logRef = useRef<HTMLPreElement>(null);
  const data = status.data;
  const running = Boolean(data?.running);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [data?.logTail]);

  const plans = data ? [data.plan.backend, data.plan.frontend] : [];
  const blocked = plans.find((p) => p.error || p.dirty || p.buildsOnLive === false);
  const nothing = plans.length > 0 && plans.every((p) => p.live && p.live === p.dev);

  const go = () =>
    start.mutate(undefined, {
      onSuccess: () => {
        setTyped('');
        toast.success('Deploy started — follow it below');
        void status.refetch();
      },
      onError: (e) => toast.error((e as Error).message),
    });

  const last = data?.last;
  const meta = last ? RUN_META[last.status] ?? RUN_META.failed : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <header className="mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Rocket className="h-4 w-4 text-brand-600" /> Deploy to production
        </h2>
        <p className="text-xs text-slate-500">
          Puts exactly what this dev server runs onto https://talenthub.dbl-group.com —
          database backup first; if anything fails the previous release is restored
          automatically. GitHub <code>main</code> is updated only after a healthy deploy.
        </p>
      </header>

      {status.isLoading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {plans.map((p) => (
              <PlanCard key={p.label} plan={p} />
            ))}
          </div>

          {last && meta && (
            <div className={cn('flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ring-1', meta.tone)}>
              <meta.icon className={cn('mt-0.5 h-4 w-4 shrink-0', (last.status === 'running' || last.status === 'rolling_back') && 'animate-spin')} />
              <div className="min-w-0">
                <p className="font-semibold">{meta.label}</p>
                <p className="text-xs">{last.message}</p>
                <p className="mt-0.5 text-[0.6875rem] opacity-70">
                  Run {last.runId}
                  {last.finishedAt ? ` · finished ${new Date(last.finishedAt).toLocaleString('en-GB')}` : ''}
                </p>
              </div>
            </div>
          )}

          {(running || data?.logTail) && (
            <pre
              ref={logRef}
              className="max-h-80 overflow-auto rounded-xl bg-slate-900 px-3 py-2 text-[0.6875rem] leading-relaxed text-slate-100"
            >
              {data?.logTail || 'Starting…'}
            </pre>
          )}

          {!running && (
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-rose-200 bg-rose-50/50 p-3">
              <div className="min-w-[12rem] flex-1">
                <Input
                  label="Type DEPLOY to put this build live"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="DEPLOY"
                  autoComplete="off"
                  disabled={Boolean(blocked) || nothing}
                />
              </div>
              <Button
                variant="danger"
                leftIcon={<Rocket className="h-4 w-4" />}
                disabled={typed !== 'DEPLOY' || Boolean(blocked) || nothing}
                isLoading={start.isPending}
                onClick={go}
              >
                Deploy to Prod
              </Button>
              {(blocked || nothing) && (
                <p className="w-full text-xs text-rose-700">
                  {nothing
                    ? 'Live already runs exactly this build.'
                    : blocked?.error
                      ? `${blocked.label}: ${blocked.error}`
                      : blocked?.dirty
                        ? `${blocked.label} on the dev server has uncommitted changes.`
                        : `${blocked?.label}: the live site has commits this dev build does not. Merge main into dev, test, then deploy.`}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function PlanCard({ plan }: { plan: RepoPlan }) {
  if (plan.error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
        <p className="font-semibold">{plan.label}</p>
        <p>{plan.error}</p>
      </div>
    );
  }
  const same = plan.live === plan.dev;
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
        {plan.label}
        <span className="font-mono text-xs font-normal text-slate-500">
          live {plan.live} → dev {plan.dev} ({plan.devBranch})
        </span>
      </p>
      {same ? (
        <p className="mt-1 text-xs text-slate-500">No changes.</p>
      ) : (
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
          {(plan.commits ?? []).map((c) => (
            <li key={c.sha} className="flex items-start gap-1.5 text-xs">
              <GitCommitHorizontal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="min-w-0">
                <span className="font-mono text-slate-400">{c.sha}</span>{' '}
                <span className="text-slate-800">{c.subject}</span>
                <span className="text-slate-400"> · {c.author}, {c.when}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
