import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Filter,
  GraduationCap,
  Sparkles,
  Target,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  PageHeader,
  SegmentedToggle,
  Spinner,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

interface AiSettings {
  shortlistThreshold: number;
  autoScreen: boolean;
  autoRoleProfile: boolean;
  provider: string;
  configured: boolean;
}

interface ScreeningSettings {
  writtenTestPassPct: number;
  aiTestPassPct: number;
}


const PRESETS = [
  { label: 'Lenient', value: 40 },
  { label: 'Balanced', value: 60 },
  { label: 'Strict', value: 80 },
];

export default function AiSettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'ai'],
    queryFn: () =>
      http.get<ApiResponse<AiSettings>>('/settings/ai').then((r) => r.data),
  });

  const [threshold, setThreshold] = useState(60);
  const [autoScreen, setAutoScreen] = useState(true);
  const [autoRoleProfile, setAutoRoleProfile] = useState(false);

  useEffect(() => {
    if (data) {
      setThreshold(data.shortlistThreshold);
      setAutoScreen(data.autoScreen);
      setAutoRoleProfile(data.autoRoleProfile);
    }
  }, [data]);

  const dirty =
    !!data &&
    (threshold !== data.shortlistThreshold ||
      autoScreen !== data.autoScreen ||
      autoRoleProfile !== data.autoRoleProfile);

  const save = useMutation({
    mutationFn: () =>
      http
        .patch<ApiResponse<AiSettings>>('/settings/ai', {
          shortlistThreshold: threshold,
          autoScreen,
          autoRoleProfile,
        })
        .then((r) => r.data),
    onSuccess: (d) => {
      qc.setQueryData<AiSettings>(['settings', 'ai'], (old) =>
        old ? { ...old, ...d } : old,
      );
      toast.success('AI settings saved');
    },
    onError: (e) => toast.error((e as Error).message || 'Could not save'),
  });

  // --- Screening pass marks (Written Test + AI Proficiency Test) -----------
  const { data: screening, isLoading: screeningLoading } = useQuery({
    queryKey: ['settings', 'screening'],
    queryFn: () =>
      http.get<ApiResponse<ScreeningSettings>>('/settings/screening').then((r) => r.data),
  });

  const [writtenPassPct, setWrittenPassPct] = useState(50);
  const [aiPassPct, setAiPassPct] = useState(50);

  useEffect(() => {
    if (screening) {
      setWrittenPassPct(screening.writtenTestPassPct);
      setAiPassPct(screening.aiTestPassPct);
    }
  }, [screening]);

  const screeningDirty =
    !!screening &&
    (writtenPassPct !== screening.writtenTestPassPct || aiPassPct !== screening.aiTestPassPct);

  const saveScreening = useMutation({
    mutationFn: () =>
      http
        .patch<ApiResponse<ScreeningSettings>>('/settings/screening', {
          writtenTestPassPct: writtenPassPct,
          aiTestPassPct: aiPassPct,
        })
        .then((r) => r.data),
    onSuccess: (d) => {
      qc.setQueryData<ScreeningSettings>(['settings', 'screening'], (old) =>
        old ? { ...old, ...d } : old,
      );
      toast.success('Screening pass marks saved');
    },
    onError: (e) => toast.error((e as Error).message || 'Could not save'),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="AI Settings"
        description="Tune how AI assists recruitment across the system. Super users only."
      />

      {isLoading || !data ? (
        <Card>
          <CardBody className="flex justify-center py-10">
            <Spinner />
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Provider status banner */}
          <div
            className={cn(
              'flex items-center justify-between gap-3 rounded-2xl border p-4',
              data.configured
                ? 'border-violet-100 bg-gradient-to-r from-violet-50 to-white'
                : 'border-amber-200 bg-amber-50',
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  data.configured
                    ? 'bg-violet-100 text-violet-600'
                    : 'bg-amber-100 text-amber-600',
                )}
              >
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {data.configured
                    ? 'AI is connected'
                    : 'AI is not configured'}
                </p>
                <p className="text-xs text-slate-500">
                  {data.configured
                    ? 'Screening, role profiles, exams and questions are powered by AI.'
                    : 'Settings save, but take effect only once an API key is set on the server.'}
                </p>
              </div>
            </div>
            <Badge tone={data.configured ? 'brand' : 'warning'} className="capitalize">
              {data.provider}
            </Badge>
          </div>

          {/* Screening */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-violet-600" />
                CV Screening
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-6">
              {/* Threshold */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-slate-400" />
                    <p className="text-sm font-medium text-slate-800">
                      AI Shortlist match threshold
                    </p>
                  </div>
                  <span className="rounded-lg bg-violet-600 px-2.5 py-1 text-sm font-bold text-white">
                    {threshold}%
                  </span>
                </div>
                <p className="mb-3 ml-6 text-xs text-slate-400">
                  CVs scoring at or above this auto-advance to “AI Shortlisted”.
                </p>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-slate-200 via-violet-200 to-violet-400 accent-violet-600"
                />
                <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                  <span>0% · lenient</span>
                  <span>50%</span>
                  <span>100% · strict</span>
                </div>
                <div className="mt-3 flex gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setThreshold(p.value)}
                      className={cn(
                        'rounded-lg border px-3 py-1 text-xs font-medium transition',
                        threshold === p.value
                          ? 'border-violet-300 bg-violet-50 text-violet-700'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                      )}
                    >
                      {p.label} · {p.value}%
                    </button>
                  ))}
                </div>
              </div>

              <Divider />

              <SettingRow
                icon={Sparkles}
                title="Auto-screen new CVs"
                desc="Score and shortlist each CV automatically as it arrives — apply page, Drive sync, uploads."
                value={autoScreen}
                onChange={setAutoScreen}
              />
            </CardBody>
          </Card>

          {/* Automation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-violet-600" />
                Automation
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-5">
              <SettingRow
                icon={Wand2}
                title="Auto-generate role profile on approval"
                desc="When a requisition is fully approved, generate its AI role profile automatically."
                value={autoRoleProfile}
                onChange={setAutoRoleProfile}
              />
            </CardBody>
          </Card>

          {/* Screening pass marks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-violet-600" />
                Screening Test Pass Marks
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-6">
              {screeningLoading || !screening ? (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-400">
                    Minimum % of marks a candidate must score on each Salary Fixation
                    pre-interview test to pass. Below this, the candidate is disqualified
                    and interviewer scoring is blocked.
                  </p>
                  <PassMarkSlider label="Written Test" value={writtenPassPct} onChange={setWrittenPassPct} />
                  <Divider />
                  <PassMarkSlider
                    label="AI Proficiency Test"
                    value={aiPassPct}
                    onChange={setAiPassPct}
                  />
                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-400">
                      {screeningDirty ? 'You have unsaved changes.' : 'All changes saved.'}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => saveScreening.mutate()}
                      isLoading={saveScreening.isPending}
                      disabled={!screeningDirty}
                    >
                      Save pass marks
                    </Button>
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          {/* Sticky save bar */}
          <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
            <p className="text-xs text-slate-400">
              {dirty ? 'You have unsaved changes.' : 'All changes saved.'}
            </p>
            <Button
              onClick={() => save.mutate()}
              isLoading={save.isPending}
              disabled={!dirty}
            >
              Save settings
            </Button>
          </div>

        </>
      )}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-slate-100" />;
}

function PassMarkSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <span className="rounded-lg bg-violet-600 px-2.5 py-1 text-sm font-bold text-white">
          {value}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-rose-200 via-amber-200 to-emerald-300 accent-violet-600"
      />
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

function SettingRow({
  icon: Icon,
  title,
  desc,
  value,
  onChange,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-800">{title}</p>
          <p className="text-xs text-slate-400">{desc}</p>
        </div>
      </div>
      <SegmentedToggle value={value} onChange={onChange} />
    </div>
  );
}
