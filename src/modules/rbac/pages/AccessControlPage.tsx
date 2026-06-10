import { useState } from 'react';
import { KeyRound } from 'lucide-react';

import { PageHeader } from '@shared/components/ui';
import { cn } from '@shared/lib';

import { RoleManager } from '../components/RoleManager';
import { AssignmentManager } from '../components/AssignmentManager';

type Tab = 'assignments' | 'roles';

const TABS: { key: Tab; label: string }[] = [
  { key: 'assignments', label: 'People & access' },
  { key: 'roles', label: 'Roles' },
];

export default function AccessControlPage() {
  const [tab, setTab] = useState<Tab>('assignments');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Access Control"
        description="Decide who can sign in and what they can do, scoped by unit."
      />

      {/* Login-gate context */}
      <div className="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
          <KeyRound className="h-4 w-4" />
        </span>
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-800">
            Granting a role here unlocks sign-in.
          </span>{' '}
          Only people with a role can log in — everyone else (synced employees)
          stays locked out. Remove all of someone&rsquo;s roles to block their
          access.
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'assignments' ? <AssignmentManager /> : <RoleManager />}
    </div>
  );
}
