import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  CheckCircle2,
  KeyRound,
  PlugZap,
  Save,
  Settings2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Input,
  Spinner,
} from '@shared/components/ui';

import { bdJobsApi } from '../api/bdjobs.api';
import type { BdJobsSettingsInput } from '../types/bdjobs.types';

const SETTINGS_KEY = ['bdjobs', 'settings'] as const;

type Draft = Partial<BdJobsSettingsInput>;

/** Admin configuration for the BDJobs job-export integration. */
export function BdJobsSettingsCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: bdJobsApi.getSettings,
  });
  const [draft, setDraft] = useState<Draft>({});
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Seed the form once the saved settings arrive (secrets stay blank).
  useEffect(() => {
    if (!data) return;
    setDraft({
      enabled: data.enabled,
      baseUrl: data.baseUrl,
      companyId: data.companyId,
      signatureFormat: data.signatureFormat,
      specialInstruction: data.specialInstruction,
      otherBenefits: data.otherBenefits,
      deadlineDays: data.deadlineDays,
      applyOnlineDefault: data.applyOnlineDefault,
      publicApplyBaseUrl: data.publicApplyBaseUrl,
      entryLevelMaxYears: data.entryLevelMaxYears,
      midLevelMaxYears: data.midLevelMaxYears,
    });
  }, [data]);

  const save = useMutation({
    mutationFn: (input: Draft) => bdJobsApi.updateSettings(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
      qc.invalidateQueries({ queryKey: ['bdjobs-status'] });
      toast.success('BDJobs settings saved');
    },
    onError: () => toast.error('Could not save the settings'),
  });

  // Tests exactly what's on screen — not the saved values.
  const test = useMutation({
    mutationFn: () =>
      bdJobsApi.testConnection({
        baseUrl: draft.baseUrl,
        companyId: draft.companyId,
        authToken: draft.authToken,
        decodeId: draft.decodeId,
        signatureFormat: draft.signatureFormat,
      }),
    onSuccess: (r) => {
      setTestResult(r);
      if (r.ok) toast.success('BDJobs connection OK');
      else toast.error('BDJobs rejected the credentials');
    },
    onError: () => toast.error('Could not reach BDJobs'),
  });

  const set = <K extends keyof BdJobsSettingsInput>(
    key: K,
    value: BdJobsSettingsInput[K],
  ) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setTestResult(null); // a changed credential invalidates the last result
  };

  if (isLoading || !data) {
    return (
      <Card>
        <CardBody className="flex justify-center py-10">
          <Spinner />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-brand-600" />
          BDJobs · Job Export
        </CardTitle>
        <div className="flex items-center gap-2">
          {data.configured ? (
            <Badge tone="success" dot>
              Configured
            </Badge>
          ) : (
            <Badge tone="warning" dot>
              Not configured
            </Badge>
          )}
          {!draft.enabled && <Badge tone="neutral">Posting off</Badge>}
        </div>
      </CardHeader>

      <CardBody className="space-y-6">
        {/* Connection */}
        <section className="space-y-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <KeyRound className="h-3.5 w-3.5" /> Connection
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Company ID"
              value={draft.companyId ?? ''}
              onChange={(e) => set('companyId', e.target.value)}
            />
            <Input
              label="API base URL"
              value={draft.baseUrl ?? ''}
              onChange={(e) => set('baseUrl', e.target.value)}
            />
            <Input
              label="API token"
              placeholder={data.authTokenMasked || 'Not set'}
              value={draft.authToken ?? ''}
              onChange={(e) => set('authToken', e.target.value)}
              hint="Leave blank to keep the saved token"
            />
            <Input
              label="Decode ID"
              placeholder={data.decodeIdMasked || 'Not set'}
              value={draft.decodeId ?? ''}
              onChange={(e) => set('decodeId', e.target.value)}
              hint="Leave blank to keep the saved value"
            />
          </div>
          <Input
            label="Signature format (advanced)"
            value={draft.signatureFormat ?? ''}
            onChange={(e) => set('signatureFormat', e.target.value)}
            hint="SHA-256 template. Placeholders: {token} {decodeId} {companyId} {ts}"
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              isLoading={test.isPending}
              leftIcon={<PlugZap className="h-4 w-4" />}
              onClick={() => test.mutate()}
            >
              Test connection
            </Button>
            {testResult ? (
              <span
                className={`inline-flex items-center gap-1.5 text-sm ${
                  testResult.ok ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {testResult.message}
              </span>
            ) : (
              <span className="text-xs text-slate-400">
                Checks the values shown above (no job is created).
              </span>
            )}
          </div>
        </section>

        {/* Posting defaults */}
        <section className="space-y-3 border-t border-slate-100 pt-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Settings2 className="h-3.5 w-3.5" /> Posting defaults
          </p>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Special instruction (shown on every ad)
            </label>
            <textarea
              rows={2}
              value={draft.specialInstruction ?? ''}
              onChange={(e) => set('specialInstruction', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Other benefits
            </label>
            <textarea
              rows={2}
              value={draft.otherBenefits ?? ''}
              onChange={(e) => set('otherBenefits', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Deadline window (days)"
              type="number"
              min={1}
              max={30}
              value={String(draft.deadlineDays ?? 29)}
              onChange={(e) => set('deadlineDays', Number(e.target.value))}
              hint="BDJobs allows max 30"
            />
            <Input
              label="Entry level below (yrs)"
              type="number"
              min={0}
              max={20}
              value={String(draft.entryLevelMaxYears ?? 3)}
              onChange={(e) => set('entryLevelMaxYears', Number(e.target.value))}
            />
            <Input
              label="Mid level below (yrs)"
              type="number"
              min={1}
              max={30}
              value={String(draft.midLevelMaxYears ?? 8)}
              onChange={(e) => set('midLevelMaxYears', Number(e.target.value))}
              hint="At or above = Top"
            />
          </div>

          <div>
            <Input
              label="Public apply base URL"
              placeholder="https://hrm.dbl-group.com"
              value={draft.publicApplyBaseUrl ?? ''}
              onChange={(e) => set('publicApplyBaseUrl', e.target.value)}
              hint="Your site's domain only. Leave blank to use the server's origin — set this once you're on SSL, otherwise ads link to localhost."
            />
            <p className="mt-1 text-[0.6875rem] text-slate-400">
              Each job gets its own link automatically:{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-600">
                {(draft.publicApplyBaseUrl || 'http://localhost:3000').replace(
                  /\/+$/,
                  '',
                )}
                /apply/&#123;requisition-id&#125;
              </code>
            </p>
          </div>

          <div className="flex flex-wrap gap-4 pt-1">
            <Toggle
              checked={draft.applyOnlineDefault ?? true}
              onChange={(v) => set('applyOnlineDefault', v)}
              label="Send our apply link by default"
            />
            <Toggle
              checked={draft.enabled ?? true}
              onChange={(v) => set('enabled', v)}
              label="BDJobs posting enabled"
            />
          </div>
        </section>

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <Button
            isLoading={save.isPending}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => save.mutate(draft)}
          >
            Save settings
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-sm text-slate-700"
    >
      <span
        className={`relative h-5 w-9 rounded-full transition ${
          checked ? 'bg-brand-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            checked ? 'left-[1.125rem]' : 'left-0.5'
          }`}
        />
      </span>
      {label}
    </button>
  );
}
