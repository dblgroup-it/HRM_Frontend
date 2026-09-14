import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronUp,
  ClipboardList,
  ClipboardPen,
  Ear,
  Eye,
  FileText,
  IdCard,
  Printer,
  Sparkles,
  Upload,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

import { Button, Input, Spinner, Textarea } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { useAuth } from '@modules/auth';

import {
  useMedicalExam,
  useSetMedical,
  useUploadMedicalReport,
  useUpsertMedicalExam,
} from '../hooks/useOnboarding';
import type { MedicalExam, MedicalQueueItem } from '../types/onboarding.types';
import { printMedicalReport } from '../utils/printMedicalReport';
import { resolveApiFileUrl } from '@shared/api';

type Draft = Partial<MedicalExam>;

/** Read-only, system-filled value — used for Ref No and the consultant identity. */
function AutoField({
  label,
  value,
  placeholder = '—',
}: {
  label: string;
  value: string;
  placeholder?: string;
}) {
  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-wide text-slate-400">
          Auto
        </span>
      </div>
      <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
        <span className={value ? 'text-slate-700' : 'text-slate-400'}>
          {value || placeholder}
        </span>
      </div>
    </div>
  );
}

/** A text field with a clinically-normal value shown as a tap-to-fill chip —
 * disappears once the officer has typed something, so it never clutters an
 * already-answered field. */
function SuggestInput({
  label,
  value,
  onChange,
  normal,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** The typical/normal finding — shown as "Normal: X" and fillable in one tap. */
  normal: string;
} & Omit<React.ComponentProps<typeof Input>, 'label' | 'value' | 'onChange'>) {
  return (
    <div>
      <Input
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
      {!value && (
        <button
          type="button"
          onClick={() => onChange(normal)}
          className="mt-1.5 inline-flex items-center gap-1 text-[0.6875rem] font-medium text-slate-400 transition-colors hover:text-brand-600"
        >
          <Sparkles className="h-3 w-3" />
          Normal: <span className="text-slate-500 group-hover:text-brand-600">{normal}</span> — tap to use
        </button>
      )}
    </div>
  );
}

/** Checkbox-style Yes/No — the "tick one" control of a clinical checklist. */
function YesNo({
  value,
  onChange,
  yesLabel = 'Yes',
  noLabel = 'No',
}: {
  value: boolean | null | undefined;
  onChange: (v: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
}) {
  const opt = (label: string, selected: boolean, tone: 'emerald' | 'rose', onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 text-xs font-semibold',
        selected
          ? tone === 'emerald' ? 'text-emerald-700' : 'text-rose-700'
          : 'text-slate-400 hover:text-slate-600',
      )}
    >
      <span
        className={cn(
          'flex h-4 w-4 items-center justify-center rounded border',
          selected
            ? tone === 'emerald'
              ? 'border-emerald-600 bg-emerald-600 text-white'
              : 'border-rose-600 bg-rose-600 text-white'
            : 'border-slate-300',
        )}
      >
        {selected && (tone === 'emerald' ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />)}
      </span>
      {label}
    </button>
  );
  return (
    <div className="flex shrink-0 items-center gap-3">
      {opt(yesLabel, value === true, 'emerald', () => onChange(true))}
      {opt(noLabel, value === false, 'rose', () => onChange(false))}
    </div>
  );
}

function ChecklistItem({
  n,
  text,
  value,
  onChange,
}: {
  n: number;
  text: string;
  value: boolean | null | undefined;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-slate-100 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <p className="text-sm text-slate-700">
        <span className="mr-1.5 text-slate-400">{n}.</span>
        {text}
      </p>
      <YesNo value={value} onChange={onChange} />
    </div>
  );
}

const row2 = 'grid grid-cols-1 gap-5 sm:grid-cols-2';
const row4 = 'grid grid-cols-2 gap-5 sm:grid-cols-4';

const SECTIONS = [
  {
    key: 'details',
    letter: 'A',
    title: 'Report Details',
    description: 'Header information for this examination.',
    icon: IdCard,
  },
  {
    key: 'vitals',
    letter: 'B',
    title: 'Vitals',
    description: 'Height, weight, pulse and blood pressure.',
    icon: Activity,
  },
  {
    key: 'vision',
    letter: 'C',
    title: 'Vision',
    description: 'Visual acuity and color vision.',
    icon: Eye,
  },
  {
    key: 'hearing',
    letter: 'D',
    title: 'Hearing & Speech',
    description: 'Ears, speech and extremities.',
    icon: Ear,
  },
  {
    key: 'checklist',
    letter: 'E',
    title: 'Clinical Findings',
    description: "The doctor's clinical checklist.",
    icon: ClipboardList,
  },
  {
    key: 'determination',
    letter: 'F',
    title: 'Determination',
    description: 'Blood group and the fit-to-join decision.',
    icon: BadgeCheck,
  },
] as const;

/** Fields that must be filled for a section to earn its checkmark — mirrors
 * the backend's required-at-clearance set (dutyPosition, refNo,
 * registrationNo, familyHistoryDetail and remarks stay optional). */
const SECTION_FIELDS: (keyof MedicalExam)[][] = [
  ['dateOfBirth', 'examDate', 'issueDate', 'consultantName'],
  ['height', 'weight', 'pulse', 'bloodPressure'],
  [
    'visionRightEye',
    'visionLeftEye',
    'visionWithGlass',
    'colorVisionYellow',
    'colorVisionRed',
    'colorVisionGreen',
    'colorVisionBlue',
  ],
  ['hearingRightEar', 'hearingLeftEar', 'speech', 'extremities'],
  [
    'noAnemiaJaundiceEtc',
    'stableNormotensiveNondiabetic',
    'urineTestClear',
    'hepatitisBNegative',
    'liverFunctionNormal',
    'pastIllnessHistory',
    'familyHistoryDmHtn',
  ],
  ['bloodGroup', 'fitToJoin'],
];

function isSectionComplete(draft: Draft, i: number): boolean {
  return SECTION_FIELDS[i].every((key) => {
    const v = draft[key];
    return v !== null && v !== undefined && v !== '';
  });
}

/** One section's card shell — icon, title, a "Complete" badge once every
 * required field in it is filled, and its fields as children. */
function Section({
  info,
  complete,
  children,
}: {
  info: (typeof SECTIONS)[number];
  complete: boolean;
  children: React.ReactNode;
}) {
  const Icon: LucideIcon = info.icon;
  return (
    <div
      id={`medical-section-${info.key}`}
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
    >
      <div className="flex items-start gap-3.5 border-b border-slate-100 bg-slate-50/60 px-6 py-4 sm:px-8">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-brand-600">
            Section {info.letter}
          </p>
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">{info.title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{info.description}</p>
        </div>
        {complete && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[0.6875rem] font-semibold text-emerald-700">
            <Check className="h-3 w-3" /> Complete
          </span>
        )}
      </div>
      <div className="p-6 sm:p-8">{children}</div>
    </div>
  );
}

/**
 * Structured "Medical Fitness Report" form — every section laid out as its
 * own card, all visible at once (not paginated behind a stepper), so the
 * examining officer can see and cross-check the whole report the way they
 * would the paper form. Common vitals/findings show a tap-to-fill "Normal"
 * suggestion so a routine, healthy result doesn't need retyping.
 * Rendered inline by MedicalQueuePage when a card is expanded.
 */
export function MedicalExamForm({
  item,
  onClose,
}: {
  item: MedicalQueueItem;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { data: exam, isLoading } = useMedicalExam(item.id, true);
  const upsert = useUpsertMedicalExam(item.id);
  const upload = useUploadMedicalReport(item.id);
  const setMedical = useSetMedical();
  const fileRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<Draft>({});
  const [decision, setDecision] = useState<'clear' | 'manual' | 'reject' | null>(null);
  const [note, setNote] = useState('');

  // The consultant is whoever is signed in and filling this out — not a
  // free-text field the officer has to type themselves.
  useEffect(() => {
    if (exam) {
      setDraft({
        ...exam,
        consultantName: exam.consultantName || user?.name || '',
        // Most exams are done without glasses — default it so the officer
        // only has to act when it's actually "with glass".
        visionWithGlass: exam.visionWithGlass ?? false,
        // Most candidates are fit to join — default it so the officer only
        // has to act when they're actually not.
        fitToJoin: exam.fitToJoin ?? true,
        // Clinical checklist — most candidates are normal/healthy on all of
        // these, so default to the healthy answer and let the officer flag
        // the exception instead of confirming the common case every time.
        noAnemiaJaundiceEtc: exam.noAnemiaJaundiceEtc ?? true,
        stableNormotensiveNondiabetic: exam.stableNormotensiveNondiabetic ?? true,
        urineTestClear: exam.urineTestClear ?? true,
        hepatitisBNegative: exam.hepatitisBNegative ?? true,
        liverFunctionNormal: exam.liverFunctionNormal ?? true,
        familyHistoryDmHtn: exam.familyHistoryDmHtn ?? true,
      });
    }
  }, [exam, user?.name]);

  const set = <K extends keyof MedicalExam>(key: K, value: MedicalExam[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const reportDoc = item.docs.find((d) => d.label === 'Medical Fitness Report');

  // Ref No is server-assigned and read-only — the backend rejects it if we
  // send it back (it's not part of the update DTO).
  const saveBody = () => {
    const { refNo: _refNo, ...body } = draft;
    return body;
  };
  const save = () => upsert.mutate(saveBody());

  const submitDecision = async () => {
    if (!decision) return;
    // A manual clearance attests to an exam done on paper, so there is no
    // on-screen form to persist first — saving it would write a half-empty
    // report that never happened.
    if (decision !== 'manual') {
      // Persist whatever's on screen first — including auto-filled defaults
      // the officer never explicitly "saved" — so the clearance check below
      // validates the same data the checkmarks are showing, not stale DB rows.
      try {
        await upsert.mutateAsync(saveBody());
      } catch {
        return; // upsert's own onError already surfaced the reason
      }
    }
    setMedical.mutate(
      {
        onboardingId: item.id,
        status: decision === 'reject' ? 'rejected' : 'cleared',
        // Clearing reuses the Remarks already written on the Determination
        // section — asking for notes a second time was confusing. A manual
        // clearance has its own note, since there is no report to read.
        note: (decision === 'clear' ? draft.remarks : note) || undefined,
        manual: decision === 'manual',
      },
      { onSuccess: onClose },
    );
  };

  const pickFile = () => fileRef.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload.mutate(file);
    e.target.value = '';
  };

  const t = (v: string | undefined | null) => v ?? '';
  const onInput =
    <K extends keyof MedicalExam>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(key, e.target.value as MedicalExam[K]);

  const sectionsComplete = SECTIONS.map((_, i) => isSectionComplete(draft, i));
  const allComplete = sectionsComplete.every(Boolean);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5">
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-800">{item.candidate.name}</span>
          <span className="text-slate-400"> · {item.candidate.designation}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,application/msword,.docx"
            className="hidden"
            onChange={onFile}
          />
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Upload className="h-3.5 w-3.5" />}
            isLoading={upload.isPending}
            onClick={pickFile}
          >
            {reportDoc ? 'Replace report' : 'Attach signed report'}
          </Button>
          {reportDoc && (
            <a
              href={resolveApiFileUrl(reportDoc.url)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
            >
              <FileText className="h-3.5 w-3.5" />
              View
            </a>
          )}
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Printer className="h-3.5 w-3.5" />}
            onClick={() => printMedicalReport(item.candidate, draft)}
          >
            Print
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200/60 hover:text-slate-700"
          >
            <ChevronUp className="h-3.5 w-3.5" />
            Collapse
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <>
          {/* Section jump-nav — quick scroll, not a gate; every section is
              already on screen below. */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {SECTIONS.map((s, i) => (
              <a
                key={s.key}
                href={`#medical-section-${s.key}`}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  sectionsComplete[i]
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700',
                )}
              >
                {sectionsComplete[i] ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span className="font-semibold">{s.letter}</span>
                )}
                {s.title}
              </a>
            ))}
          </div>

          {/* All sections, laid out as one form */}
          <div className="space-y-4">
            <Section info={SECTIONS[0]} complete={sectionsComplete[0]}>
              <div className={row2}>
                <Input
                  type="date"
                  label="Date of Birth"
                  value={t(draft.dateOfBirth)}
                  onChange={onInput('dateOfBirth')}
                />
                <Input
                  label="Duty Position"
                  placeholder="Optional"
                  value={t(draft.dutyPosition)}
                  onChange={onInput('dutyPosition')}
                />
                <Input
                  type="date"
                  label="Date of Examination"
                  value={t(draft.examDate)}
                  onChange={onInput('examDate')}
                />
                <Input
                  type="date"
                  label="Date of Issue"
                  value={t(draft.issueDate)}
                  onChange={onInput('issueDate')}
                />
                <AutoField label="Ref No" value={t(draft.refNo)} placeholder="Assigned on save" />
                <Input
                  label="Registration No"
                  placeholder="Optional"
                  value={t(draft.registrationNo)}
                  onChange={onInput('registrationNo')}
                />
                <AutoField label="Consultant" value={t(draft.consultantName)} />
              </div>
            </Section>

            <Section info={SECTIONS[1]} complete={sectionsComplete[1]}>
              <div className={row4}>
                <Input label="Height" placeholder="e.g. 170 cm" value={t(draft.height)} onChange={onInput('height')} />
                <Input label="Weight" placeholder="e.g. 65 kg" value={t(draft.weight)} onChange={onInput('weight')} />
                <SuggestInput
                  label="Pulse"
                  value={t(draft.pulse)}
                  onChange={(v) => set('pulse', v)}
                  normal="60–100 bpm"
                />
                <SuggestInput
                  label="Blood Pressure"
                  value={t(draft.bloodPressure)}
                  onChange={(v) => set('bloodPressure', v)}
                  normal="120/80 mmHg"
                />
              </div>
            </Section>

            <Section info={SECTIONS[2]} complete={sectionsComplete[2]}>
              <div className="space-y-6">
                <div>
                  <div className={row2}>
                    <SuggestInput
                      label="Right Eye"
                      value={t(draft.visionRightEye)}
                      onChange={(v) => set('visionRightEye', v)}
                      normal="6/6"
                    />
                    <SuggestInput
                      label="Left Eye"
                      value={t(draft.visionLeftEye)}
                      onChange={(v) => set('visionLeftEye', v)}
                      normal="6/6"
                    />
                  </div>
                  <div className="mt-3">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Glasses
                    </span>
                    <YesNo
                      value={draft.visionWithGlass}
                      onChange={(v) => set('visionWithGlass', v)}
                      yesLabel="With glass"
                      noLabel="Without glass"
                    />
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Color Vision
                  </p>
                  <div className={row4}>
                    <SuggestInput
                      label="Yellow"
                      value={t(draft.colorVisionYellow)}
                      onChange={(v) => set('colorVisionYellow', v)}
                      normal="Normal"
                    />
                    <SuggestInput
                      label="Red"
                      value={t(draft.colorVisionRed)}
                      onChange={(v) => set('colorVisionRed', v)}
                      normal="Normal"
                    />
                    <SuggestInput
                      label="Green"
                      value={t(draft.colorVisionGreen)}
                      onChange={(v) => set('colorVisionGreen', v)}
                      normal="Normal"
                    />
                    <SuggestInput
                      label="Blue"
                      value={t(draft.colorVisionBlue)}
                      onChange={(v) => set('colorVisionBlue', v)}
                      normal="Normal"
                    />
                  </div>
                </div>
              </div>
            </Section>

            <Section info={SECTIONS[3]} complete={sectionsComplete[3]}>
              <div className={row4}>
                <SuggestInput
                  label="Right Ear"
                  value={t(draft.hearingRightEar)}
                  onChange={(v) => set('hearingRightEar', v)}
                  normal="Normal"
                />
                <SuggestInput
                  label="Left Ear"
                  value={t(draft.hearingLeftEar)}
                  onChange={(v) => set('hearingLeftEar', v)}
                  normal="Normal"
                />
                <SuggestInput
                  label="Speech"
                  value={t(draft.speech)}
                  onChange={(v) => set('speech', v)}
                  normal="Normal"
                />
                <SuggestInput
                  label="Extremities"
                  value={t(draft.extremities)}
                  onChange={(v) => set('extremities', v)}
                  normal="No deformity"
                />
              </div>
            </Section>

            <Section info={SECTIONS[4]} complete={sectionsComplete[4]}>
              <div>
                <div>
                  <ChecklistItem
                    n={1}
                    text="No anemia, jaundice, clubbing, koilonychia or congenital malformations"
                    value={draft.noAnemiaJaundiceEtc}
                    onChange={(v) => set('noAnemiaJaundiceEtc', v)}
                  />
                  <ChecklistItem
                    n={2}
                    text="Physically & mentally stable, normotensive, nondiabetic"
                    value={draft.stableNormotensiveNondiabetic}
                    onChange={(v) => set('stableNormotensiveNondiabetic', v)}
                  />
                  <ChecklistItem
                    n={3}
                    text="Urine test clear of sugar / albumin"
                    value={draft.urineTestClear}
                    onChange={(v) => set('urineTestClear', v)}
                  />
                  <ChecklistItem
                    n={4}
                    text="Free from Hepatitis B"
                    value={draft.hepatitisBNegative}
                    onChange={(v) => set('hepatitisBNegative', v)}
                  />
                  <ChecklistItem
                    n={5}
                    text="Liver function normal"
                    value={draft.liverFunctionNormal}
                    onChange={(v) => set('liverFunctionNormal', v)}
                  />
                </div>
                <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Textarea
                    rows={2}
                    label="6. History of past illness"
                    placeholder="Not remarkable"
                    value={t(draft.pastIllnessHistory)}
                    onChange={onInput('pastIllnessHistory')}
                  />
                  <div>
                    <div className="flex flex-col gap-2 py-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <p className="text-sm text-slate-700">
                        <span className="mr-1.5 text-slate-400">7.</span>
                        Family history of DM, HTN — negative
                      </p>
                      <YesNo
                        value={draft.familyHistoryDmHtn}
                        onChange={(v) => set('familyHistoryDmHtn', v)}
                      />
                    </div>
                    <Input
                      label="Detail (optional)"
                      className="mt-2"
                      value={t(draft.familyHistoryDetail)}
                      onChange={onInput('familyHistoryDetail')}
                    />
                  </div>
                </div>
              </div>
            </Section>

            <Section info={SECTIONS[5]} complete={sectionsComplete[5]}>
              <div className="space-y-5">
                <div className={row2}>
                  <Input
                    label="Blood Group"
                    placeholder="e.g. B+"
                    value={t(draft.bloodGroup)}
                    onChange={onInput('bloodGroup')}
                  />
                  <div>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Fit to Join
                    </span>
                    <div className="flex h-10 items-center">
                      <YesNo
                        value={draft.fitToJoin}
                        onChange={(v) => set('fitToJoin', v)}
                        yesLabel="Fit"
                        noLabel="Not fit"
                      />
                    </div>
                  </div>
                </div>
                <Textarea
                  rows={2}
                  label="Remarks (optional)"
                  value={t(draft.remarks)}
                  onChange={onInput('remarks')}
                />
              </div>
            </Section>
          </div>

          {/* Save draft — persists whatever's on screen, any time */}
          <div className="flex justify-end">
            <Button variant="outline" isLoading={upsert.isPending} onClick={save}>
              Save draft
            </Button>
          </div>

          {/* Decision — Clear / Reject */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            {!decision ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-400">
                  {allComplete
                    ? 'All sections complete.'
                    : 'Clearing needs every section above — or record a check done on paper.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="danger"
                    leftIcon={<XCircle className="h-4 w-4" />}
                    onClick={() => setDecision('reject')}
                  >
                    Reject
                  </Button>
                  {/* Plenty of medicals happen at a clinic on paper. This
                      records the outcome without pretending the digital
                      report was filled in. */}
                  <Button
                    variant="outline"
                    leftIcon={<ClipboardPen className="h-4 w-4" />}
                    onClick={() => setDecision('manual')}
                  >
                    Checked by hand
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={() => setDecision('clear')}
                  >
                    Clear candidate
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  'space-y-3 rounded-xl border-2 p-3',
                  decision === 'clear'
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : decision === 'manual'
                      ? 'border-sky-200 bg-sky-50/50'
                      : 'border-rose-200 bg-rose-50/50',
                )}
              >
                <p
                  className={cn(
                    'flex items-center gap-1.5 text-sm font-semibold',
                    decision === 'clear'
                      ? 'text-emerald-700'
                      : decision === 'manual'
                        ? 'text-sky-700'
                        : 'text-rose-700',
                  )}
                >
                  {decision === 'clear' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Clearing this candidate — the
                      report above must be complete.
                    </>
                  ) : decision === 'manual' ? (
                    <>
                      <ClipboardPen className="h-4 w-4" /> Recording a manual check
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" /> Marking as rejected
                    </>
                  )}
                </p>
                {decision === 'manual' && (
                  <p className="text-xs leading-5 text-sky-800">
                    The candidate is cleared without the digital report. It will
                    be recorded as checked by hand, in your name — attach the
                    signed copy above if you have it.
                  </p>
                )}
                {decision === 'clear' ? (
                  draft.remarks && (
                    <p className="text-xs text-emerald-800">
                      Remarks: <span className="italic">"{draft.remarks}"</span>
                    </p>
                  )
                ) : (
                  <Textarea
                    rows={2}
                    label={
                      decision === 'manual'
                        ? 'What was checked, and where'
                        : 'Reason (optional)'
                    }
                    placeholder={
                      decision === 'manual'
                        ? 'e.g. Fitness certificate issued by Dr. Rahman, Popular Diagnostic, 08 Sep — fit to join'
                        : 'e.g. requires follow-up tests'
                    }
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                )}
                <div className="flex gap-2">
                  <Button
                    fullWidth
                    variant={decision === 'reject' ? 'danger' : undefined}
                    className={
                      decision === 'clear'
                        ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                        : decision === 'manual'
                          ? 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800'
                          : undefined
                    }
                    // The note is the only record of a check that happened off
                    // the system, so it isn't optional here.
                    disabled={decision === 'manual' && !note.trim()}
                    isLoading={upsert.isPending || setMedical.isPending}
                    onClick={submitDecision}
                  >
                    {decision === 'reject'
                      ? 'Confirm rejection'
                      : decision === 'manual'
                        ? 'Record manual clearance'
                        : 'Confirm clearance'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDecision(null);
                      setNote('');
                    }}
                    disabled={upsert.isPending || setMedical.isPending}
                  >
                    Back
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
