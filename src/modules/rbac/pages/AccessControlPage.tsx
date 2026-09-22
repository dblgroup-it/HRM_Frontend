import { useMemo, useState } from 'react';
import { KeyRound, Layers, Tags, Users2 } from 'lucide-react';

import {
  LifecycleTabs,
  PageHeader,
  type LifecycleTab,
} from '@shared/components/ui';

import { RoleManager } from '../components/RoleManager';
import { AssignmentManager } from '../components/AssignmentManager';
import { HrLayeringPanel } from '../components/HrLayeringPanel';
import { useAssignments, useRoles } from '../hooks/useRbac';

type Tab = 'assignments' | 'layering' | 'roles';

/**
 * Access Control — who can sign in, who covers whom, and the roles themselves.
 *
 * Switched with the same centred glass bar as a requisition's lifecycle tabs,
 * so the two most-used admin surfaces move the same way: a sliding pill, the
 * content fading in under it, arrow keys between tabs.
 */
export default function AccessControlPage() {
  const [tab, setTab] = useState<Tab>('assignments');
  // Both already fetched by the tabs themselves — these read the same cache,
  // so the counts on the bar cost no extra request.
  const { data: assignments } = useAssignments();
  const { data: roles } = useRoles();

  const tabs = useMemo<LifecycleTab<Tab>[]>(() => {
    const people = new Set((assignments ?? []).map((a) => a.user.id)).size;
    const layered = (assignments ?? []).filter(
      (a) => a.role.key === 'factory_hr',
    ).length;
    return [
      { key: 'assignments', label: 'People & access', icon: Users2, count: people },
      { key: 'layering', label: 'HR Layering', icon: Layers, count: layered },
      { key: 'roles', label: 'Roles', icon: Tags, count: roles?.length },
    ];
  }, [assignments, roles]);

  return (
    <div className="space-y-6">
      <div className="animate-rise-in">
        <PageHeader
          title="Access Control"
          description="Decide who can sign in, what they can do, and who covers them."
        />
      </div>

      {/* The one thing people get wrong: a role IS the login. */}
      <div
        className="animate-rise-in flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3"
        style={{ animationDelay: '60ms', animationFillMode: 'backwards' }}
      >
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-brand-600 shadow-sm">
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

      <LifecycleTabs tabs={tabs} active={tab} onChange={setTab} />

      {/* Keyed on the tab so each switch replays the fade, as on a requisition. */}
      <div key={tab} className="animate-fade-in">
        {tab === 'assignments' && (
          <AssignmentManager onOpenLayering={() => setTab('layering')} />
        )}
        {tab === 'layering' && <HrLayeringPanel />}
        {tab === 'roles' && <RoleManager />}
      </div>
    </div>
  );
}
