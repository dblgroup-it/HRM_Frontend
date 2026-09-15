import type { MedicalExam } from '../types/onboarding.types';

/**
 * The clinical record behind a submitted finding.
 *
 * The Central Medical Officer is being asked to confirm someone else's
 * judgement, which is impossible from a name and a "Fit" badge. This is the
 * evidence, grouped the way the examining form is filled in so the two read
 * the same way round.
 *
 * Empty fields are dropped rather than shown blank: on a form with thirty
 * optional fields, rendering them all as "—" buries the handful that were
 * actually recorded.
 */

type Row = [label: string, value: string | null];

const text = (v: string | null | undefined): string | null => {
  const t = (v ?? '').trim();
  return t ? t : null;
};

/** A tri-state flag. `null` means "not recorded", which is not the same as No. */
const flag = (v: boolean | null | undefined, yes = 'Yes', no = 'No') =>
  v === null || v === undefined ? null : v ? yes : no;

const date = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
};

function Group({ title, rows }: { title: string; rows: Row[] }) {
  const filled = rows.filter(([, v]) => v !== null && v !== '');
  if (!filled.length) return null;
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <dl className="space-y-1">
        {filled.map(([label, value]) => (
          <div key={label} className="flex gap-2 text-xs leading-5">
            <dt className="shrink-0 text-slate-400">{label}</dt>
            <dd className="min-w-0 break-words font-medium text-slate-700">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function MedicalExamDetail({ exam }: { exam: MedicalExam | null }) {
  if (!exam) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
        No structured exam was recorded for this candidate — the finding rests
        on the examining officer's note alone.
      </p>
    );
  }

  const screening: Row[] = [
    ['Anaemia / jaundice', flag(exam.noAnemiaJaundiceEtc, 'Clear', 'Present')],
    ['BP / diabetes', flag(exam.stableNormotensiveNondiabetic, 'Stable', 'Unstable')],
    ['Urine', flag(exam.urineTestClear, 'Clear', 'Abnormal')],
    ['Hepatitis B', flag(exam.hepatitisBNegative, 'Negative', 'POSITIVE')],
    ['Liver function', flag(exam.liverFunctionNormal, 'Normal', 'Abnormal')],
  ];

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
      <Group
        title="Examination"
        rows={[
          ['Consultant', text(exam.consultantName)],
          ['Examined', date(exam.examDate)],
          ['Issued', date(exam.issueDate)],
          ['Reg. no', text(exam.registrationNo)],
          ['Ref. no', text(exam.refNo)],
          ['Duty position', text(exam.dutyPosition)],
        ]}
      />
      <Group
        title="Vitals"
        rows={[
          ['Height', text(exam.height)],
          ['Weight', text(exam.weight)],
          ['Pulse', text(exam.pulse)],
          ['Blood pressure', text(exam.bloodPressure)],
          ['Blood group', text(exam.bloodGroup)],
          ['Date of birth', date(exam.dateOfBirth)],
        ]}
      />
      <Group
        title="Vision"
        rows={[
          ['Right eye', text(exam.visionRightEye)],
          ['Left eye', text(exam.visionLeftEye)],
          ['With glasses', flag(exam.visionWithGlass)],
          ['Colour — yellow', text(exam.colorVisionYellow)],
          ['Colour — red', text(exam.colorVisionRed)],
          ['Colour — green', text(exam.colorVisionGreen)],
          ['Colour — blue', text(exam.colorVisionBlue)],
        ]}
      />
      <Group
        title="Hearing & mobility"
        rows={[
          ['Right ear', text(exam.hearingRightEar)],
          ['Left ear', text(exam.hearingLeftEar)],
          ['Speech', text(exam.speech)],
          ['Extremities', text(exam.extremities)],
        ]}
      />
      <Group title="Screening" rows={screening} />
      <Group
        title="History"
        rows={[
          ['Past illness', text(exam.pastIllnessHistory)],
          ['Family DM / HTN', flag(exam.familyHistoryDmHtn)],
          ['Family detail', text(exam.familyHistoryDetail)],
          ['Remarks', text(exam.remarks)],
        ]}
      />
    </div>
  );
}
