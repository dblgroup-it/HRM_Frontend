import { useState } from 'react';
import { Pencil, RefreshCw, Sparkles, X } from 'lucide-react';

import {
  BusyOverlay,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
} from '@shared/components/ui';
import { formatRelative } from '@shared/utils';

import type { Requisition, RoleProfile } from '../types/requisition.types';
import {
  useGenerateRoleProfile,
  useUpdateRoleProfile,
} from '../hooks/useRequisitionActions';

const GENERATED_BY_LABEL: Record<string, string> = {
  ai: 'AI-generated',
  template: 'Generated from template',
  manual: 'Edited by HR',
};

export function RoleProfilePanel({
  requisition,
  canContinue,
}: {
  requisition: Requisition;
  canContinue: boolean;
}) {
  const generate = useGenerateRoleProfile();
  const profile = requisition.roleProfile;
  const [editing, setEditing] = useState(false);

  const editable =
    canContinue && requisition.status !== 'posted';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Profile · Step 3</CardTitle>
        {profile && editable && !editing && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              isLoading={generate.isPending}
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => generate.mutate(requisition.id)}
            >
              Regenerate
            </Button>
          </div>
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
                {canContinue
                  ? 'Generate the AI role profile'
                  : 'Awaiting Corporate HR'}
              </p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Generate it with AI, then fine-tune it by hand — or write it from
                scratch. Corporate HR continues from this step after full
                approval.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                disabled={!canContinue}
                isLoading={generate.isPending}
                leftIcon={<Sparkles className="h-4 w-4" />}
                onClick={() => generate.mutate(requisition.id)}
              >
                {canContinue
                  ? generate.isPending
                    ? 'Generating…'
                    : 'Generate with AI'
                  : 'Corporate HR required'}
              </Button>
              {canContinue && (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  Write manually
                </Button>
              )}
            </div>
          </div>
        ) : editing ? (
          <RoleProfileForm
            id={requisition.id}
            profile={profile}
            onDone={() => setEditing(false)}
          />
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg bg-brand-50/60 p-4">
              <p className="text-sm text-slate-700">{profile.summary}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600">
                <Sparkles className="h-3 w-3" />
                {GENERATED_BY_LABEL[profile.generatedBy ?? 'ai'] ??
                  'AI-generated'}{' '}
                {formatRelative(profile.generatedAt)}
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
      <BusyOverlay show={generate.isPending} label="Generating role profile…" />
    </Card>
  );
}

function RoleProfileForm({
  id,
  profile,
  onDone,
}: {
  id: string;
  profile: RoleProfile;
  onDone: () => void;
}) {
  const update = useUpdateRoleProfile();
  const [summary, setSummary] = useState(profile.summary);
  const [jobDescription, setJobDescription] = useState(profile.jobDescription);
  const [responsibilities, setResponsibilities] = useState(
    profile.responsibilities.join('\n'),
  );
  const [requirements, setRequirements] = useState(
    profile.requirements.join('\n'),
  );

  const save = () => {
    const toLines = (s: string) =>
      s
        .split('\n')
        .map((l) => l.replace(/^[-•\s]+/, '').trim())
        .filter(Boolean);
    update.mutate(
      {
        id,
        input: {
          summary: summary.trim(),
          jobDescription: jobDescription.trim(),
          responsibilities: toLines(responsibilities),
          requirements: toLines(requirements),
        },
      },
      { onSuccess: onDone },
    );
  };

  return (
    <div className="space-y-4">
      <Input
        label="Summary"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
      />
      <Textarea
        label="Job description"
        rows={4}
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Textarea
          label="Responsibilities (one per line)"
          rows={6}
          value={responsibilities}
          onChange={(e) => setResponsibilities(e.target.value)}
        />
        <Textarea
          label="Requirements (one per line)"
          rows={6}
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          leftIcon={<X className="h-4 w-4" />}
          onClick={onDone}
          disabled={update.isPending}
        >
          Cancel
        </Button>
        <Button isLoading={update.isPending} onClick={save}>
          Save profile
        </Button>
      </div>
      {update.isError && (
        <p className="text-sm text-red-600">
          {(update.error as Error).message}
        </p>
      )}
    </div>
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
