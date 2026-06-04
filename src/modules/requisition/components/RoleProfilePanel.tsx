import { Sparkles, RefreshCw } from 'lucide-react';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from '@shared/components/ui';
import { formatRelative } from '@shared/utils';

import type { Requisition } from '../types/requisition.types';
import { useGenerateRoleProfile } from '../hooks/useRequisitionActions';

export function RoleProfilePanel({
  requisition,
}: {
  requisition: Requisition;
}) {
  const generate = useGenerateRoleProfile();
  const profile = requisition.roleProfile;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Profile · Step 3</CardTitle>
        {profile && (
          <Button
            size="sm"
            variant="ghost"
            isLoading={generate.isPending}
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => generate.mutate(requisition.id)}
          >
            Regenerate
          </Button>
        )}
      </CardHeader>
      <CardBody>
        {!profile ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Sparkles className="h-6 w-6" />
            </span>
            <div>
              <p className="font-medium text-slate-800">
                Generate the AI role profile
              </p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                The system reads the position, organization, department and
                employee level to produce a structured JD, responsibilities and
                requirements.
              </p>
            </div>
            <Button
              isLoading={generate.isPending}
              leftIcon={<Sparkles className="h-4 w-4" />}
              onClick={() => generate.mutate(requisition.id)}
            >
              {generate.isPending ? 'Generating…' : 'Generate role profile'}
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg bg-brand-50/60 p-4">
              <p className="text-sm text-slate-700">{profile.summary}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600">
                <Sparkles className="h-3 w-3" />
                AI-generated {formatRelative(profile.generatedAt)}
              </p>
            </div>

            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Job description
              </h4>
              <p className="text-sm text-slate-600">{profile.jobDescription}</p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ProfileList
                title="Responsibilities"
                items={profile.responsibilities}
              />
              <ProfileList title="Requirements" items={profile.requirements} />
            </div>
          </div>
        )}
        {generate.isError && (
          <p className="mt-3 text-sm text-red-600">
            {(generate.error as Error).message}
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function ProfileList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-600">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
