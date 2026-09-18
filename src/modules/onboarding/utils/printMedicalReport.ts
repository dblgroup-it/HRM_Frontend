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

/** "12.09.1997" — how the paper form writes a date of birth. */
const dob = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
};

/** "12/09/26" — how the form writes exam and issue dates. */
const short = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
};

const ageFrom = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const before =
    now.getMonth() < d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
  if (before) a -= 1;
  return a >= 0 && a < 120 ? ` (${a} yrs)` : '';
};

const val = (v: string | null | undefined): string => esc(v) || '—';

/**
 * One of the numbered findings.
 *
 * The paper form states every finding in the clear: "He/she is having no
 * Anemia…". That works on paper because a doctor only writes the form out when
 * the answer is yes. Generating it from stored data, the answer can be no or
 * unrecorded — and printing the affirmative sentence anyway would put a false
 * clinical statement on a signed certificate.
 *
 * So the wording follows the value: the form's sentence when true, an explicit
 * contrary sentence when false, and a plainly marked gap when nothing was
 * recorded. Never silence, and never the wrong claim.
 */
const finding = (
  v: boolean | null | undefined,
  affirmative: string,
  negative: string,
): string => {
  if (v === true) return esc(affirmative);
  if (v === false)
    return `<span class="neg">${esc(negative)}</span>`;
  return `${esc(affirmative)} <span class="gap">— NOT RECORDED</span>`;
};

/**
 * DBL's "Medical Fitness Report", rebuilt from the structured exam.
 *
 * Laid out to match the signed paper form: the same addressee, the same
 * certifying paragraph, the same eight numbered findings, the same two
 * signature blocks. HR prints this and it belongs in the same file as the
 * handwritten ones.
 *
 * Opens the print dialog directly — the codebase's existing no-new-dependency
 * "view as PDF" pattern (see printSummary.ts).
 */
export function printMedicalReport(
  c: ReportCandidate,
  exam: Partial<MedicalExam>,
): void {
  const doctor = esc(exam.consultantName) || '________________';
  const issued = short(exam.issueDate) || short(exam.examDate);

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Medical Fitness Report — ${esc(c.name)}</title>
<style>
  @page { size: A4; margin: 10mm 12mm; }
  /* The grey title bar and the banded rows are part of the form; without this
     most browsers drop every background when printing and the page comes out
     as plain text that no longer resembles the signed original. */
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* Sized to land on ONE A4 page. The report ran to two before: the second
     carried nothing but the signature blocks, so every printout wasted a sheet
     and the signatures arrived detached from the findings they attest to. */
  body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 0; font-size: 10.5px; line-height: 1.34; }
  .brand { text-align: center; font-size: 17px; font-weight: 700; letter-spacing: .01em; margin-bottom: 6px; }
  .title { border: 1px solid #000; background: #d9d9d9; font-size: 15px; font-weight: 700; padding: 4px 9px; margin-bottom: 8px; }
  .addr { margin-bottom: 6px; line-height: 1.3; }
  table.kv { width: 100%; border-collapse: collapse; margin: 6px 0 7px; }
  table.kv td { padding: 2px 6px; vertical-align: top; }
  table.kv td.k { width: 42%; text-align: right; font-weight: 700; color: #000; }
  table.kv tr:nth-child(odd) td { background: #efefef; }
  table.kv tr:nth-child(odd) td.k { background: #e4e4e4; }
  .cert { text-align: justify; margin: 7px 0; }
  .bar { border-top: 2px solid #9a9a9a; border-bottom: 2px solid #9a9a9a; height: 5px; margin: 7px 0 6px; background: #f1f1f1; }
  .line { padding: 2px 0; border-bottom: 1px solid #e4e4e4; }
  .line b { font-weight: 700; }
  .hl { background: #dbe9f7; }
  ol { margin: 7px 0 0; padding-left: 20px; }
  ol li { margin-bottom: 2.5px; }
  .neg { font-weight: 700; }
  .gap { font-weight: 700; letter-spacing: .03em; }
  /* Kept with the findings: a signature that breaks onto its own page is a
     signature attached to nothing. */
  .sigs { display: flex; justify-content: space-between; margin-top: 34px; font-weight: 700; break-inside: avoid; page-break-inside: avoid; }
  .sigs .r { text-align: right; }
  .sigs .date { font-weight: 400; margin-bottom: 2px; }
  .foot { margin-top: 14px; padding-top: 5px; border-top: 1px solid #000; font-size: 9px; break-inside: avoid; }
  .foot b { font-weight: 700; }
</style></head><body>

<div class="brand">DBL Group</div>
<div class="title">MEDICAL FITNESS REPORT FOR DBL GROUP</div>

<div class="addr">
  To<br>
  Mr. Kamal Hosen<br>
  CHRO, Group-HR<br>
  DBL Group<br>
  Corporate Office,<br>
  DBL Group| Capital South Avenue, (4th Floor),<br>
  House: 50, Road: 03, Gulshan: 01, Dhaka 1212 | Bangladesh|<br>
  Dear Sir,<br>
  Medical Fitness report is sent for your kind information.
</div>

<table class="kv">
  <tr><td class="k">Name of Application :</td><td>${val(c.name)}</td></tr>
  <tr><td class="k">Date of Birth /Age :</td><td>${dob(exam.dateOfBirth)}${ageFrom(exam.dateOfBirth) || ''}</td></tr>
  <tr><td class="k">Examination of Duty as :</td><td>${esc(exam.dutyPosition) || esc(c.designation) || 'Not available'}</td></tr>
  <tr><td class="k">Ref. No :</td><td>${val(exam.refNo)}</td></tr>
  <tr><td class="k">Our Registration no :</td><td>${esc(exam.registrationNo)}</td></tr>
  <tr><td class="k">Date of Exam :</td><td>${short(exam.examDate)}</td></tr>
  <tr><td class="k">Date of Issue :</td><td>${short(exam.issueDate)}</td></tr>
</table>

<p class="cert">
  I the undersigned Dr. ${doctor}, Medical Officer (Medical and Health Care
  Services), DBL Group after performing the required General health
  examinations (Physical /Clinical), F/H of remarkable illness, routine Eye
  exam. and Lab. Tests, according to PEME protocol for DBL Group, certify that
  the above named person is found: -
</p>

<div class="bar"></div>

<div class="line">
  <b>Height:</b> ${val(exam.height)} &nbsp;&nbsp;
  <b>Weight:</b> ${val(exam.weight)} &nbsp;&nbsp;
  <b>Pulse:</b> ${val(exam.pulse)} &nbsp;&nbsp;
  <b>Blood Pressure:</b> ${val(exam.bloodPressure)}
</div>
<div class="line">
  <b>Visual Acuity :</b> &nbsp; <b>Rt. Eye:</b> ${val(exam.visionRightEye)}
  &nbsp;&nbsp; <b>Left Eye:</b> ${val(exam.visionLeftEye)}
  &nbsp;&nbsp; (${exam.visionWithGlass === true ? 'with glass' : exam.visionWithGlass === false ? 'without glass' : 'glass not recorded'})
</div>
<div class="line">
  <b>Color Vision:</b> &nbsp; <b>Yellow:</b> ${val(exam.colorVisionYellow)}
  &nbsp; <b>Red:</b> ${val(exam.colorVisionRed)}
  &nbsp; <b>Green:</b> ${val(exam.colorVisionGreen)}
  &nbsp; <b>Blue:</b> ${val(exam.colorVisionBlue)}
</div>
<div class="line hl">
  <b>Hearing :</b> &nbsp; <b>Rt. Ear :</b> ${val(exam.hearingRightEar)}
  &nbsp;&nbsp;&nbsp; <b>Left Ear :</b> ${val(exam.hearingLeftEar)}
</div>
<div class="line hl">
  <b>Speech :</b> ${val(exam.speech)}
  &nbsp;&nbsp;&nbsp; <b>Extremities :</b> ${val(exam.extremities)}
</div>

<ol>
  <li>${finding(
    exam.noAnemiaJaundiceEtc,
    'He/ she is having no Anemia, Jaundice, Clubbing, Koilonychias, Congenital malformations.',
    'Anemia, Jaundice, Clubbing, Koilonychia or Congenital malformation was FOUND on examination.',
  )}</li>
  <li>${finding(
    exam.stableNormotensiveNondiabetic,
    'He/she is physically & mentally stable & normotensive, nondiabetic.',
    'He/she is NOT recorded as stable, normotensive and nondiabetic.',
  )}</li>
  <li>${finding(
    exam.urineTestClear,
    'His/her urine test is found not to contain sugar / Albumin',
    'His/her urine test WAS found to contain sugar / Albumin.',
  )}</li>
  <li>${finding(
    exam.hepatitisBNegative === true && exam.liverFunctionNormal === true
      ? true
      : exam.hepatitisBNegative === null || exam.liverFunctionNormal === null
        ? null
        : false,
    'He is free from Hepatitis B virus infection. His / Her Liver function is normal.',
    'Hepatitis B status or liver function is NOT normal — see remarks.',
  )}</li>
  <li>${
    esc(exam.pastIllnessHistory)
      ? `History of past illness: ${esc(exam.pastIllnessHistory)}`
      : 'History of past illness is not remarkable.'
  }</li>
  <li>${finding(
    exam.familyHistoryDmHtn === null || exam.familyHistoryDmHtn === undefined
      ? null
      : !exam.familyHistoryDmHtn,
    'Family history of DM, HTN (-) ve',
    `Family history of DM, HTN (+) ve${exam.familyHistoryDetail ? ` — ${esc(exam.familyHistoryDetail)}` : ''}`,
  )}</li>
  <li>${finding(
    exam.fitToJoin,
    'On the basis of above investigations, Physical Examination he/she is considered physically & mentally fit to join with DBL Group.',
    'On the basis of above investigations, he/she is NOT considered fit to join with DBL Group.',
  )}</li>
  <li>Remarks (If any). ${esc(exam.remarks) || ''}${exam.bloodGroup ? `${exam.remarks ? ' · ' : ''}Blood group; <b>${esc(exam.bloodGroup)}</b>` : ''}</li>
</ol>

<div class="sigs">
  <div>Chief Medical Officer<br>DBL GROUP</div>
  <div class="r">
    <div class="date">${issued}</div>
    Medical Officer<br>DBL GROUP
  </div>
</div>

<div class="foot">
  <b>CORPORATE OFFICE:</b> DBL Group| Capital South Avenue, (4th Floor),
  House: 50, Road: 03, Gulshan: 01 Dhaka 1212 , Bangladesh
</div>

<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},250)})</script>
</body></html>`;

  const win = window.open('', '_blank', 'width=900,height=1180');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
