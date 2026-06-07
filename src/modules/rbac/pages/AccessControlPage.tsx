import { useState } from 'react';

import { PageHeader } from '@shared/components/ui';
import { cn } from '@shared/lib';

import { RoleManager } from '../components/RoleManager';
import { AssignmentManager } from '../components/AssignmentManager';

type Tab = 'assignments' | 'roles';

const TABS: { key: Tab; label: string }[] = [
  { key: 'assignments', label: 'Assignments' },
  { key: 'roles', label: 'Roles' },
];

export default function AccessControlPage() {
  const [tab, setTab] = useState<Tab>('assignments');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Access Control"
        description="Configure roles and assign them to employees, scoped by unit."
      />

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
