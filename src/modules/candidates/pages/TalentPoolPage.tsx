import { Link } from 'react-router-dom';
import { Building2, FileText, ShieldAlert, Star } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  FullPageSpinner,
  PageHeader,
} from '@shared/components/ui';
import { Avatar } from '@shared/components/ui';
import { ROUTES } from '@app/router/paths';
import { useMyPermissions } from '@modules/rbac';

import { useTalentPool, useToggleTalentPool } from '../hooks/useCandidates';
import { canAccessRecruitment } from '../access';

export default function TalentPoolPage() {
  const { data: perms, isLoading: permsLoading } = useMyPermissions();
  const { data = [], isLoading } = useTalentPool();
  const toggle = useToggleTalentPool();

  if (isLoading || permsLoading)
    return <FullPageSpinner label="Loading talent pool…" />;

  if (!canAccessRecruitment(perms)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Talent Pool" />
        <EmptyState
          icon={<ShieldAlert className="h-6 w-6" />}
          title="Restricted to recruitment roles"
          description="The talent pool is available to Corporate HR, CHRO and super users only."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Talent Pool"
        description="Suitable candidates kept for future recall — bookmarked from requisition pipelines."
      />

      {data.length === 0 ? (
        <EmptyState
          icon={<Star className="h-6 w-6" />}
          title="Talent pool is empty"
          description="Star a candidate in any requisition's pipeline to keep them here for future openings."
        />
      ) : (
        <Card className="divide-y divide-slate-100">
          {data.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <Avatar name={c.name} size="sm" />
              <div className="min-w-[160px] flex-1">
                <p className="text-sm font-medium text-slate-800">{c.name}</p>
                <p className="truncate text-xs text-slate-400">
                  {[c.email, c.phone].filter(Boolean).join(' · ') ||
                    'No contact details'}
                </p>
              </div>

              <div className="hidden min-w-[180px] flex-1 text-xs text-slate-500 sm:block">
                <p className="flex items-center gap-1 font-medium text-slate-600">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  {c.requisition.designation}
                </p>
                <p className="truncate">
                  {c.requisition.code} · {c.requisition.unit}
                </p>
              </div>

              <Badge tone="neutral" className="capitalize">
                {c.stage}
              </Badge>

              {c.cvUrl && (
                <a
                  href={c.cvUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
                >
                  <FileText className="h-3.5 w-3.5" /> CV
                </a>
              )}

              <Link to={ROUTES.requisitionDetail(c.requisition.id)}>
                <Button variant="outline" size="sm">
                  Open role
                </Button>
              </Link>

              <button
                type="button"
                title="Remove from talent pool"
                onClick={() => toggle.mutate({ id: c.id, talentPool: false })}
                className="rounded-md p-1.5 text-amber-500 hover:bg-amber-50"
              >
                <Star className="h-4 w-4" fill="currentColor" />
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
