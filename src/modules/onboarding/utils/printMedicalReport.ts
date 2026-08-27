import type { MedicalExam } from '../types/onboarding.types';

interface ReportCandidate {
  name: string;
  designation: string;
  unit: string;
  department: string;
}

const esc = (v: string | null | undefined): string =>
  (v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const d = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '—';

const tri = (v: boolean | null | undefined, yes = 'Yes', no = 'No'): string =>
  v === true ? yes : v === false ? no : '—';

const row = (label: string, value: string): string =>
  `<tr><td class="k">${label}</td><td>${value || '—'}</td></tr>`;

/**
 * Recreates DBL's paper "Medical Fitness Report" letterhead from structured
 * exam data and opens the browser print dialog — the codebase's existing
 * no-new-dependency "view as PDF" pattern (see printSummary.ts).
 */
export function printMedicalReport(
  c: ReportCandidate,
  exam: Partial<MedicalExam>,
): void {
  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Medical Fitness Report — ${esc(c.name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 32px; font-size: 12px; line-height: 1.55; }
  header { text-align: center; border-bottom: 3px solid #1877c0; padding-bottom: 10px; margin-bottom: 16px; }
  h1 { font-size: 17px; margin: 0; color: #1877c0; letter-spacing: .02em; }
  .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
  .addr { margin: 14px 0; font-size: 12px; }
  h2 { font-size: 12px; margin: 16px 0 6px; text-transform: uppercase; letter-spacing: .04em; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 3px 8px; vertical-align: top; text-align: left; }
  table.kv td.k { width: 200px; color: #64748b; }
  table.grid td.k { width: 140px; color: #64748b; }
  ol { margin: 4px 0 0; padding-left: 20px; }
  ol li { margin-bottom: 5px; }
  .sig { display: flex; justify-content: flex-end; margin-top: 56px; }
  .sig div { width: 260px; border-top: 1px solid #334155; padding-top: 6px; text-align: center; color: #475569; }
  footer { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; }
  @media print { body { margin: 12mm; } }
</style></head><body>
<header>
  <h1>MEDICAL FITNESS REPORT FOR DBL GROUP</h1>
  <div class="sub">Consultant (Medical and Health Care Services)</div>
</header>

<div class="addr">
  To<br>
  <b>Sr. Manager, Group-HR</b><br>
  DBL Group
</div>

<table class="kv">
  ${row('Name of Applicant', esc(c.name))}
  ${row('Designation', esc(c.designation))}
  ${row('Unit / Department', `${esc(c.unit)}${c.department ? ` — ${esc(c.department)}` : ''}`)}
  ${row('Date of Birth', d(exam.dateOfBirth))}
  ${row('Duty Position', esc(exam.dutyPosition))}
</table>
<table class="kv">
  ${row('Ref No', esc(exam.refNo))}
  ${row('Our Registration No', esc(exam.registrationNo))}
  ${row('Date of Examination', d(exam.examDate))}
  ${row('Date of Issue', d(exam.issueDate))}
</table>

<h2>Vitals</h2>
<table class="grid">
  ${row('Height', esc(exam.height))}
  ${row('Weight', esc(exam.weight))}
  ${row('Pulse', esc(exam.pulse))}
  ${row('Blood Pressure', esc(exam.bloodPressure))}
</table>

<h2>Visual Acuity</h2>
<table class="grid">
  ${row('Right Eye', esc(exam.visionRightEye))}
  ${row('Left Eye', esc(exam.visionLeftEye))}
  ${row('Glass', tri(exam.visionWithGlass, 'With glass', 'Without glass'))}
</table>

<h2>Color Vision</h2>
<table class="grid">
  ${row('Yellow', esc(exam.colorVisionYellow))}
  ${row('Red', esc(exam.colorVisionRed))}
  ${row('Green', esc(exam.colorVisionGreen))}
  ${row('Blue', esc(exam.colorVisionBlue))}
</table>

<h2>Hearing &amp; Speech</h2>
<table class="grid">
  ${row('Right Ear', esc(exam.hearingRightEar))}
  ${row('Left Ear', esc(exam.hearingLeftEar))}
  ${row('Speech', esc(exam.speech))}
  ${row('Extremities', esc(exam.extremities))}
</table>

<h2>Clinical Findings</h2>
<ol>
  <li>No anemia, jaundice, clubbing, koilonychia or congenital malformations — <b>${tri(exam.noAnemiaJaundiceEtc)}</b></li>
  <li>Physically &amp; mentally stable, normotensive, nondiabetic — <b>${tri(exam.stableNormotensiveNondiabetic)}</b></li>
  <li>Urine test does not contain sugar / albumin — <b>${tri(exam.urineTestClear)}</b></li>
  <li>Free from Hepatitis B, liver function normal — <b>${tri(exam.hepatitisBNegative && exam.liverFunctionNormal)}</b></li>
  <li>History of past illness — ${esc(exam.pastIllnessHistory) || 'Not remarkable'}</li>
  <li>Family history of DM, HTN — <b>${tri(exam.familyHistoryDmHtn, 'Negative', 'Positive')}</b>${exam.familyHistoryDetail ? ` (${esc(exam.familyHistoryDetail)})` : ''}</li>
  <li>Overall determination — <b>${tri(exam.fitToJoin, 'FIT TO JOIN', 'NOT FIT TO JOIN')}</b></li>
</ol>

<table class="kv">
  ${row('Blood Group', esc(exam.bloodGroup))}
  ${row('Remarks', esc(exam.remarks))}
</table>

<div class="sig">
  <div>${esc(exam.consultantName) || 'Consultant'}<br>Date: ${d(exam.issueDate)}</div>
</div>

<footer>Generated by DBL HRM · Digitized from DBL Group's standard Medical Fitness Report.</footer>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},200)})</script>
</body></html>`;

  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
