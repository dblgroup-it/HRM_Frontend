import { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Database,
  FolderOpen,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  Webhook,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
  Button,
  EmptyState,
  PageHeader,
  Pagination,
  Select,
  Spinner,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { ENV } from '@shared/constants';

import { useAuthStore } from '@modules/auth';

import type { OutboxRow } from '../api/system.api';
import { DeployToProd } from '../components/DeployToProd';
import {
  useOutbox,
  useSandboxDatabases,
  useSandboxStatus,
  useSwitchDatabase,
} from '../hooks/useSystem';

const KIND_META: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
  email: { label: 'Email', icon: Mail, tone: 'bg-sky-50 text-sky-700' },
  calendar: { label: 'Calendar', icon: Calendar, tone: 'bg-emerald-50 text-emerald-700' },
  drive: { label: 'Drive', icon: FolderOpen, tone: 'bg-amber-50 text-amber-700' },
  webhook: { label: 'Webhook', icon: Webhook, tone: 'bg-violet-50 text-violet-700' },
  bdjobs: { label: 'BDJobs', icon: Send, tone: 'bg-rose-50 text-rose-700' },
};

const fmtDay = (d: string | null) =>
  d
    ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

/**
 * The dev server's controls: which day's copy of the live data it runs on,
 * and everything it would have sent out. Only exists on the dev server.
 */
export default function DevToolsPage() {
  const status = useSandboxStatus();
  const isDev = Boolean(status.data?.enabled);
  // Deploying the live site is the admin login's alone.
  const isAdminAccount = useAuthStore((s) => s.user?.role === 'admin');

  if (status.isLoading) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }
  if (!isDev) {
    return (
      <EmptyState
        icon={<Database className="h-6 w-6" />}
        title="This is the live server"
        description="Dev tools exist only on the dev server, which runs on a copy of the live data."
      />
    );
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dev Tools"
        description="This server runs on a daily copy of the live database. Nothing it does reaches a real person — every email, invite and upload is held below instead."
      />
      {isAdminAccount && <DeployToProd />}
      <DatabaseSwitcher />
      <Outbox />
    </div>
  );
}

function DatabaseSwitcher() {
  const dbs = useSandboxDatabases(true);
  const switchDb = useSwitchDatabase();
  const [restarting, setRestarting] = useState<string | null>(null);

  /** Wait for the restarted server to answer, then reload onto it. */
  const waitAndReload = async () => {
    const health = `${ENV.API_URL}/health`;
    await new Promise((r) => setTimeout(r, 3000));
    for (let i = 0; i < 60; i++) {
      try {
        const res = await fetch(health, { cache: 'no-store' });
        if (res.ok) {
          window.location.reload();
          return;
        }
      } catch {
        /* still restarting */
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    setRestarting(null);
    toast.error('The dev server did not come back — check pm2 logs hrm-backend-dev');
  };

  const pick = (name: string) =>
    switchDb.mutate(name, {
      onSuccess: () => {
        setRestarting(name);
        void waitAndReload();
      },
      onError: (e) => toast.error((e as Error).message),
    });

  const data = dbs.data;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Database className="h-4 w-4 text-brand-600" /> Data copy
          </h2>
          <p className="text-xs text-slate-500">
            A fresh copy of the live database is made every night at 02:45, and
            the last 7 days are kept. Pick the day to work on; the dev server
            restarts onto it in a few seconds. A picked day older than 7 days is
            removed, and the server goes back to the newest.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => void dbs.refetch()}
        >
          Refresh
        </Button>
      </header>

      {restarting ? (
        <p className="flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <Loader2 className="h-4 w-4 animate-spin" />
          Restarting onto {restarting === 'latest' ? 'the newest copy' : restarting}… the page reloads by itself.
        </p>
      ) : dbs.isLoading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : !data || data.copies.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
          No copies yet. Run deploy/ubuntu/dev-clone-db.sh on the server.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <CopyCard
            title="Always the newest"
            sub="Moves to each night's copy by itself"
            active={data.following === 'latest'}
            onPick={() => pick('latest')}
            busy={switchDb.isPending}
          />
          {data.copies.map((c) => (
            <CopyCard
              key={c.name}
              title={fmtDay(c.date)}
              sub={`${c.name} · ${c.sizeMb} MB`}
              active={data.following !== 'latest' && data.following === c.name}
              current={data.current === c.name}
              onPick={() => pick(c.name)}
              busy={switchDb.isPending}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CopyCard({
  title,
  sub,
  active,
  current,
  onPick,
  busy,
}: {
  title: string;
  sub: string;
  active: boolean;
  current?: boolean;
  onPick: () => void;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      disabled={busy || active}
      onClick={onPick}
      className={cn(
        'flex items-start justify-between gap-2 rounded-xl border px-4 py-3 text-left transition',
        active
          ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-300'
          : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50',
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        <span className="block truncate text-xs text-slate-500">{sub}</span>
      </span>
      {(active || current) && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[0.6875rem] font-semibold text-brand-700 ring-1 ring-brand-200">
          <CheckCircle2 className="h-3 w-3" /> {current ? 'In use' : 'Picked'}
        </span>
      )}
    </button>
  );
}

function Outbox() {
  const [kind, setKind] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const outbox = useOutbox({ kind: kind || undefined, page }, true);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Inbox className="h-4 w-4 text-brand-600" /> Sandbox outbox
          </h2>
          <p className="text-xs text-slate-500">
            What this server would have sent. Sign-in codes are here too.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={kind}
            onChange={(e) => { setKind(e.target.value); setPage(1); }}
            options={[
              { value: '', label: 'Everything' },
              ...Object.entries(KIND_META).map(([k, m]) => ({ value: k, label: m.label })),
            ]}
          />
          <Button size="sm" variant="outline" onClick={() => void outbox.refetch()} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Refresh
          </Button>
        </div>
      </header>
      {outbox.isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (outbox.data?.items.length ?? 0) === 0 ? (
        <EmptyState icon={<Inbox className="h-6 w-6" />} title="Nothing held yet" description="Anything this server tries to send will appear here." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {outbox.data!.items.map((row) => (
            <OutboxItem key={row.id} row={row} open={open === row.id} onToggle={() => setOpen(open === row.id ? null : row.id)} />
          ))}
        </ul>
      )}
      {outbox.data && outbox.data.total > outbox.data.pageSize && (
        <Pagination
          page={outbox.data.page}
          totalPages={Math.ceil(outbox.data.total / outbox.data.pageSize)}
          total={outbox.data.total}
          pageSize={outbox.data.pageSize}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}

function OutboxItem({ row, open, onToggle }: { row: OutboxRow; open: boolean; onToggle: () => void }) {
  const meta = KIND_META[row.kind] ?? KIND_META.webhook;
  const html = typeof row.meta?.html === 'string' ? row.meta.html : null;
  return (
    <li>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50">
        <span className={cn('inline-flex w-24 shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[0.6875rem] font-semibold', meta.tone)}>
          <meta.icon className="h-3.5 w-3.5" /> {meta.label}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-slate-800">{row.subject ?? '—'}</span>
          <span className="block truncate text-xs text-slate-500">
            to {row.target ?? '—'} · {new Date(row.createdAt).toLocaleString('en-GB')}
          </span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
          {html ? (
            // Rendered in a locked-down frame: no scripts, no navigation.
            <iframe title="Email preview" sandbox="" srcDoc={html} className="h-96 w-full rounded-lg border border-slate-200 bg-white" />
          ) : row.body ? (
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
              {row.body}
            </pre>
          ) : null}
          {row.meta && Object.keys(row.meta).some((k) => k !== 'html') && (
            <pre className="overflow-auto rounded-lg bg-white px-3 py-2 text-[0.6875rem] text-slate-500 ring-1 ring-slate-200">
              {JSON.stringify(Object.fromEntries(Object.entries(row.meta).filter(([k]) => k !== 'html')), null, 2)}
            </pre>
          )}
        </div>
      )}
    </li>
  );
}
