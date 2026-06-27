import { Link } from 'react-router-dom';
import { UserCheck, Users } from 'lucide-react';

import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Spinner,
} from '@shared/components/ui';
import { useCandidates } from '@modules/candidates';
import { ROUTES } from '@app/router/paths';

/**
 * The "what happens after a candidate is Selected" view: every selected hire,
 * each opening the full document → offer → medical → IT onboarding workspace.
 */
export function OnboardingTab({
  reqId,
  canManage,
}: {
  reqId: string;
  canManage: boolean;
}) {
  const { data: candidatePage, isLoading } = useCandidates(reqId, { stage: 'selected', pageSize: 200 });

  const selected = candidatePage?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-brand-600" />
          Onboarding
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
            {selected.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : selected.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No selected candidates yet"
            description="Mark a candidate as “Selected” in the Recruitment tab to begin document collection, offer, medical clearance and IT setup."
          />
        ) : (
          <div className="space-y-2">
            {selected.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5"
              >
                <Avatar name={c.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {c.name}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {[c.email, c.phone].filter(Boolean).join(' · ') ||
                      'No contact details'}
                  </p>
                </div>
                <Link to={ROUTES.onboardingManage(c.id)}>
                  <Button
                    size="sm"
                    disabled={!canManage}
                    leftIcon={<UserCheck className="h-3.5 w-3.5" />}
                  >
                    Open onboarding
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
