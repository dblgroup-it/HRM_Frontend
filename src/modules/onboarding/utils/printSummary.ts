import {
  FACILITY_META,
  FACILITY_OPTION_LABEL,
} from '@modules/requisition/constants';
import { formatCurrency } from '@shared/utils';

import type { Requisition } from '@modules/requisition';

import type {
  OnboardingResult,
  TimelineEvent,
} from '../types/onboarding.types';
import {
  RATING_QUESTIONS,
  scaleFor,
  type ReferenceCheck,
} from '../types/referenceCheck.types';

const esc = (v: string | null | undefined): string =>
  (v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** "12 Sep 2026, 14:05" — one format for the whole document. */
const dt = (iso: string | null | undefined): string =>
  iso
    ? new Date(iso).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const day = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const clock = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

const field = (label: string, value: string): string =>
  `<div class="f"><dt>${label}</dt><dd>${value || '—'}</dd></div>`;

const PHASE_LABEL: Record<TimelineEvent['phase'], string> = {
  requisition: 'Requisition & approval',
  recruitment: 'Sourcing & screening',
  assessment: 'Assessment',
  approval: 'Hiring approval',
  onboarding: 'Onboarding',
};

/**
 * The hire's full history, grouped by the day it happened.
 *
 * Grouped by date rather than by phase: a personnel file is read as "what
 * happened, in order", and phases overlap in real time — a board vote can
 * land between two documents being verified. The phase travels with each
 * entry as a tag instead.
 */
function historyHtml(events: TimelineEvent[]): string {
  if (!events.length) {
    return '<p class="muted">No recorded history.</p>';
  }
  const byDay = new Map<string, TimelineEvent[]>();
  events.forEach((ev) => {
    const k = day(ev.at);
    (byDay.get(k) ?? byDay.set(k, []).get(k)!).push(ev);
  });

  return [...byDay.entries()]
    .map(
      ([date, list]) => `
    <section class="day">
      <h4>${esc(date)}</h4>
      ${list
        .map(
          (ev) => `
      <div class="ev">
        <span class="time">${esc(clock(ev.at))}</span>
        <span class="dot" data-phase="${esc(ev.phase)}"></span>
        <div class="what">
          <p class="title">${esc(ev.title)}<span class="tag">${esc(PHASE_LABEL[ev.phase])}</span></p>
          ${ev.detail ? `<p class="detail">${esc(ev.detail)}</p>` : ''}
          ${ev.actor ? `<p class="actor">${esc(ev.actor)}</p>` : ''}
        </div>
      </div>`,
        )
        .join('')}
    </section>`,
    )
    .join('');
}


/** "12 Sep 2026" or an em dash — dates are read, not parsed, in a print-out. */
const dayOnly = (iso: string | null | undefined): string =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const sentence = (v: string | null | undefined): string =>
  (v ?? '').trim() ? esc(v).replace(/\n/g, '<br>') : '—';

/** A numbered part heading — the file reads as a sequence of parts. */
const part = (n: number, title: string): string =>
  `<h2><span class="n">${n}</span>${esc(title)}</h2>`;

/**
 * Everything the requisition says, laid out as it is on the form.
 *
 * This is the front of a personnel file: the post that was approved, on what
 * grounds and by whom. Printing the hire without it leaves the reader holding
 * an answer with no question.
 */
function requisitionHtml(req: Requisition | null | undefined): string {
  if (!req) {
    return '<p class="muted">Requisition details unavailable.</p>';
  }
  const replacements = (req.replacements ?? [])
    .map(
      (r) =>
        `<li>${esc(r.employeeName)}${r.employeeCode ? ` (${esc(r.employeeCode)})` : ''}${
          r.vacantDate ? ` — vacant ${dayOnly(r.vacantDate)}` : ''
        }</li>`,
    )
    .join('');

  const chain = (req.approvalChain ?? [])
    .map(
      (step, i) => `<tr>
        <td class="nowrap">${i + 1}</td>
        <td>${esc(step.assignee || step.title || step.role || '—')}${
          step.subtitle ? `<span class="sub-inline">${esc(step.subtitle)}</span>` : ''
        }</td>
        <td>${esc((step.status ?? '').replace(/_/g, ' '))}</td>
        <td class="nowrap">${step.actedAt ? dt(step.actedAt) : '—'}</td>
        <td>${sentence(step.note)}</td>
      </tr>`,
    )
    .join('');

  return `
<dl>
  ${field('Requisition', esc(req.code))}
  ${field('Status', esc((req.status ?? '').replace(/_/g, ' ')))}
  ${field('Raised by', esc(req.raisedBy))}
  ${field('Designation', esc(req.designationLabel || req.designation))}
  ${field('Job grade', esc(req.grade))}
  ${field('Requirement', esc((req.requirementType ?? '').replace(/_/g, ' ')))}
  ${field('Posts required', String(req.requiredPosts ?? '—'))}
  ${field('Vacant posts', String(req.totalVacantPosts ?? '—'))}
  ${field('Unit / factory', esc(req.unitFactory))}
  ${field('Department', esc(req.department))}
  ${field('Section', esc(req.section))}
  ${field('Sub-section', esc(req.subSection))}
  ${field('Line of business', esc(req.lineOfBusiness))}
  ${field('Place of posting', esc(req.placeOfPosting))}
  ${field('Priority', esc(req.priority))}
  ${field('Employment nature', esc(req.employmentNature))}
  ${field('Contractual purpose', esc(req.contractualPurpose))}
  ${field('Vacant from', dayOnly(req.vacantDate))}
  ${field('Needed by', dayOnly(req.neededDate))}
  ${field('Raised on', dayOnly(req.createdAt))}
</dl>
${
  replacements
    ? `<p class="sub">Replacing</p><ul class="notes">${replacements}</ul>`
    : ''
}
${
  req.separationReason || req.replacementRemarks
    ? `<dl class="two" style="margin-top:8px">
        ${req.separationReason ? field('Separation reason', esc(req.separationReason)) : ''}
        ${req.replacementRemarks ? field('Remarks', esc(req.replacementRemarks)) : ''}
      </dl>`
    : ''
}

<p class="sub">Job analysis</p>
<dl class="two">
  ${field('Education', sentence(req.education))}
  ${field('Experience', sentence(req.experience))}
</dl>
<p class="body">${sentence(req.jobDescription)}</p>
${req.others?.trim() ? `<p class="body muted">${sentence(req.others)}</p>` : ''}

${
  chain
    ? `<p class="sub">Approval chain</p>
<table>
  <tr><th style="width:26px">#</th><th>Approver</th><th style="width:110px">Decision</th><th style="width:130px">When</th><th>Note</th></tr>
  ${chain}
</table>`
    : ''
}`;
}

/**
 * The reference checks, summarised.
 *
 * The ratings print as the words the referee chose rather than a score: the
 * form has no score, and inventing one would put a number in a personnel file
 * that nobody said.
 */
function referenceChecksHtml(items: ReferenceCheck[]): string {
  if (!items.length) {
    return '<p class="muted">No reference checks recorded.</p>';
  }
  return items
    .map((rc) => {
      const ratings = RATING_QUESTIONS.map((q) => {
        const chosen = rc.ratings?.[q.key];
        if (!chosen) return '';
        const label =
          scaleFor(q.key).find((o) => o.value === chosen)?.label ?? chosen;
        return `<tr><td>${esc(q.text)}</td><td class="nowrap"><b>${esc(label)}</b></td></tr>`;
      })
        .filter(Boolean)
        .join('');

      return `
<section class="rc">
  <p class="rc-head">${esc(rc.refereeName)}${
    rc.refereeDesignation ? ` · ${esc(rc.refereeDesignation)}` : ''
  }${rc.refereeOrganization ? ` · ${esc(rc.refereeOrganization)}` : ''}</p>
  <dl class="two">
    ${field('Known', sentence(rc.knownDuration))}
    ${field('Relationship', sentence(rc.relationship))}
    ${field('Strengths', sentence(rc.strengths))}
    ${field('Weaknesses', sentence(rc.weaknesses))}
    ${field('Handover on leaving', sentence(rc.handover))}
    ${field('Eligible for rehire', sentence(rc.rehireEligible))}
    ${field('Concerns raised', sentence(rc.concerns))}
    ${field('Overall comments', sentence(rc.overallComments))}
  </dl>
  ${ratings ? `<table class="ratings">${ratings}</table>` : ''}
  <p class="muted rc-foot">Checked by ${esc(rc.conductedByName)} · ${dayOnly(rc.conductedAt)} · contact ${esc(rc.refereeEmail) || '—'}${
    rc.refereePhone ? ` · ${esc(rc.refereePhone)}` : ''
  }</p>
</section>`;
    })
    .join('');
}

/**
 * A print-ready record of the hire, for the hard-copy personnel file.
 *
 * Opens in its own window so the app's own chrome, navigation and theme play
 * no part in what comes out of the printer.
 */
export function printOnboardingSummary(
  data: OnboardingResult,
  timeline: TimelineEvent[] = [],
  /** The requisition this hire was raised against — the front of the file. */
  req?: Requisition | null,
  referenceChecks: ReferenceCheck[] = [],
): void {
  const c = data.candidate;
  const ob = data.onboarding;
  if (!ob) return;

  const docsRows = ob.docs
    .map(
      (doc) => `<tr>
        <td>${esc(doc.label)}</td>
        <td><span class="pill ${doc.status}">${esc(doc.status)}</span></td>
        <td class="nowrap">${dt(doc.createdAt)}</td>
      </tr>`,
    )
    .join('');

  const facilities = c.facilities
    ? FACILITY_META.map(({ key, label }) => {
        const f = c.facilities![key];
        if (!f.requested && f.status !== 'confirmed') return field(label, 'Not requested');
        const parts = [
          f.option ? (FACILITY_OPTION_LABEL[f.option] ?? f.option) : null,
          f.vehicleType
            ? (FACILITY_OPTION_LABEL[f.vehicleType] ?? f.vehicleType)
            : null,
          f.pickupLocation ? `from ${f.pickupLocation}` : null,
          f.status === 'pending'
            ? 'awaiting HR'
            : f.status === 'confirmed'
              ? 'confirmed'
              : 'skipped',
        ].filter(Boolean);
        return field(label, esc(parts.join(' · ')));
      }).join('')
    : '';

  const cc = ob.crossCheck;
  const ccFindings = (cc?.findings ?? [])
    .map(
      (f) =>
        `<li><b>[${esc(f.severity)}] ${esc(f.doc)}</b> — ${esc(f.detail)}</li>`,
    )
    .join('');

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Hiring Record — ${esc(c.name)}</title>
<style>
  @page { size: A4; margin: 14mm 13mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Arial, Helvetica, sans-serif;
         color: #12202f; margin: 0; font-size: 11px; line-height: 1.55; }

  header { display: flex; justify-content: space-between; align-items: flex-start;
           gap: 18px; padding-bottom: 12px; border-bottom: 2.5px solid #1877c0; }
  .brand { font-size: 17px; font-weight: 700; color: #1877c0; letter-spacing: .2px; }
  .doc { font-size: 10px; text-transform: uppercase; letter-spacing: .9px; color: #7b8a9c; margin-top: 2px; }
  .who { margin-top: 12px; font-size: 19px; font-weight: 700; letter-spacing: -.2px; }
  .role { color: #5a6b7f; font-size: 11.5px; }
  .meta { text-align: right; font-size: 10px; color: #7b8a9c; white-space: nowrap; }
  .meta b { color: #12202f; }
  .status { display: inline-block; margin-top: 4px; padding: 2px 9px; border-radius: 99px;
            background: #eef4fa; color: #2b5c86; font-weight: 700; font-size: 10px;
            text-transform: uppercase; letter-spacing: .4px; }

  /* Each part is numbered: the file is read in order, and a reader who is
     handed page 3 should still know which part they are in. */
  h2 { font-size: 10px; text-transform: uppercase; letter-spacing: .9px; color: #24405c;
       margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 1.5px solid #c9d7e6;
       display: flex; align-items: center; gap: 8px; break-after: avoid; }
  h2 .n { display: inline-flex; align-items: center; justify-content: center;
          width: 15px; height: 15px; border-radius: 3px; background: #1877c0; color: #fff;
          font-size: 9px; letter-spacing: 0; }
  p.sub { margin: 12px 0 5px; font-size: 9.5px; font-weight: 700; text-transform: uppercase;
          letter-spacing: .6px; color: #6b7c90; }
  .sub-inline { display: block; font-size: 9px; font-weight: 400; color: #8795a8; }
  p.body { margin: 6px 0 0; text-align: justify; }

  /* A reference check is read as one thing — never split across a page. */
  section.rc { break-inside: avoid; border: 1px solid #e6ecf4; border-radius: 5px;
               padding: 8px 10px; margin-bottom: 8px; }
  section.rc .rc-head { margin: 0 0 6px; font-weight: 700; font-size: 11.5px; color: #24405c; }
  section.rc .rc-foot { margin: 6px 0 0; font-size: 9px; }
  table.ratings { margin-top: 6px; }
  table.ratings td { padding: 3px 8px; font-size: 10px; }
  table.ratings td:last-child { width: 150px; }

  dl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 20px; margin: 0; }
  dl.two { grid-template-columns: repeat(2, 1fr); }
  .f dt { font-size: 9.5px; text-transform: uppercase; letter-spacing: .5px; color: #8795a8; }
  .f dd { margin: 1px 0 0; font-weight: 600; }

  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9.5px; text-transform: uppercase; letter-spacing: .5px;
       color: #4a5b6e; background: #f2f7fb; padding: 6px 8px; border: 1px solid #dce4ee; }
  td { padding: 6px 8px; border: 1px solid #e6ecf4; vertical-align: top; }
  .nowrap { white-space: nowrap; }
  .pill { padding: 1px 7px; border-radius: 99px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; }
  .pill.verified { background: #dcfce7; color: #15803d; }
  .pill.pending  { background: #fef4d3; color: #a16207; }
  .pill.rejected { background: #fee2e2; color: #b91c1c; }

  ul.notes { margin: 0; padding-left: 16px; }
  ul.notes li { margin-bottom: 2px; }
  .muted { color: #8795a8; }

  .verdict { display: inline-block; padding: 3px 10px; border-radius: 6px; font-weight: 700;
             font-size: 10px; text-transform: uppercase; letter-spacing: .4px; }
  .verdict.consistent    { background: #dcfce7; color: #15803d; }
  .verdict.minor_issues  { background: #fef4d3; color: #a16207; }
  .verdict.discrepancies { background: #fee2e2; color: #b91c1c; }

  /* ── History ── */
  .day { break-inside: avoid; margin-bottom: 10px; }
  .day h4 { margin: 0 0 4px; font-size: 10px; font-weight: 700; color: #2b5c86;
            background: #f2f7fb; padding: 3px 8px; border-radius: 4px; }
  .ev { display: grid; grid-template-columns: 44px 12px 1fr; align-items: start;
        gap: 0 6px; padding: 3px 0 3px 4px; break-inside: avoid; }
  .ev .time { font-size: 9.5px; color: #8795a8; padding-top: 1px; font-variant-numeric: tabular-nums; }
  .ev .dot { width: 7px; height: 7px; border-radius: 99px; margin-top: 4px; background: #b8c6d6; }
  .ev .dot[data-phase="requisition"] { background: #1877c0; }
  .ev .dot[data-phase="recruitment"] { background: #8cc63f; }
  .ev .dot[data-phase="assessment"]  { background: #e0a52b; }
  .ev .dot[data-phase="approval"]    { background: #8b5cf6; }
  .ev .dot[data-phase="onboarding"]  { background: #0f9d8f; }
  .ev .title { margin: 0; font-weight: 600; }
  .ev .tag { margin-left: 7px; font-size: 8.5px; font-weight: 600; text-transform: uppercase;
             letter-spacing: .4px; color: #8795a8; }
  .ev .detail, .ev .actor { margin: 0; font-size: 10px; color: #5a6b7f; }
  .ev .actor { color: #8795a8; font-style: italic; }

  .sig { display: flex; gap: 34px; margin-top: 30px; break-inside: avoid; }
  .sig div { flex: 1; border-top: 1px solid #4a5b6e; padding-top: 5px; text-align: center;
             font-size: 10px; color: #4a5b6e; }
  footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #e6ecf4;
           font-size: 9px; color: #a3b0bf; display: flex; justify-content: space-between; }
</style></head><body>

<header>
  <div>
    <p class="brand">DBL Group</p>
    <p class="doc">Group Corporate Human Resources · Hiring Record</p>
    <p class="who">${esc(c.name)}</p>
    <p class="role">${esc(c.designation)} · ${esc(c.department)} · ${esc(c.unit)}</p>
  </div>
  <div class="meta">
    Requisition <b>${esc(c.code)}</b><br>
    Printed ${dt(new Date().toISOString())}<br>
    <span class="status">${esc(ob.status.replace(/_/g, ' '))}</span>
  </div>
</header>

${part(1, 'Requisition')}
${requisitionHtml(req)}

${part(2, 'Candidate')}
<dl>
  ${field('Name', esc(c.name))}
  ${field('Email', esc(c.email))}
  ${field('Phone', esc(c.phone))}
  ${field('Pipeline stage', esc(c.stage.replace(/_/g, ' ')))}
  ${field('CV source', esc(c.source))}
  ${field('AI CV match', c.matchScore != null ? `${c.matchScore}/100` : '—')}
</dl>
${c.matchSummary ? `<p class="body muted">${esc(c.matchSummary)}</p>` : ''}

${part(3, 'Appointment terms')}
<dl class="two">
  ${field('Job grade', esc(c.salaryJobGrade))}
  ${field('Fixed salary', c.proposedSalary != null ? esc(formatCurrency(c.proposedSalary)) : '—')}
  ${field('Offer sent', dt(ob.offerSentAt))}
  ${field(
    'Offer answer',
    ob.offerAcceptedAt
      ? `Accepted ${dt(ob.offerAcceptedAt)}`
      : ob.offerDeclinedAt
        ? `Declined ${dt(ob.offerDeclinedAt)}`
        : 'Awaiting',
  )}
  ${field('Appointment letter', dt(ob.appointmentSentAt))}
  ${field('Code of Conduct', ob.cocSignedAt ? `Signed ${dayOnly(ob.cocSignedAt)}` : ob.cocSentAt ? 'Sent · unsigned' : 'Not sent')}
</dl>
${
  ob.offerDeclinedAt && ob.offerDeclineReason
    ? `<p class="body">Declined: &ldquo;${esc(ob.offerDeclineReason)}&rdquo;</p>`
    : ''
}
${
  c.specialNotes?.length
    ? `<ul class="notes" style="margin-top:8px">${c.specialNotes
        .map((n) => `<li>${esc(n)}</li>`)
        .join('')}</ul>`
    : ''
}

${facilities ? `${part(4, 'Facilities')}<dl>${facilities}</dl>` : ''}

${part(facilities ? 5 : 4, 'Medical clearance')}
<dl class="two">
  ${field('Status', esc(ob.medicalStatus))}
  ${field('Cleared', ob.medicalClearedAt ? `${dt(ob.medicalClearedAt)}${ob.medicalManual ? ' · recorded by hand' : ''}` : '—')}
</dl>
${ob.medicalNote ? `<p class="body">${esc(ob.medicalNote)}</p>` : ''}

${part(facilities ? 6 : 5, `Joining documents (${ob.docs.length})`)}
${
  ob.docs.length
    ? `<table><tr><th>Document</th><th style="width:110px">Status</th><th style="width:150px">Submitted</th></tr>${docsRows}</table>`
    : '<p class="muted">No documents submitted.</p>'
}
${
  ob.docsSkippedAt || ob.verificationSkippedAt
    ? '<p class="muted" style="margin-top:6px">Collection and/or verification were recorded as checked by hand.</p>'
    : ''
}

${part(facilities ? 7 : 6, `Reference checks (${referenceChecks.length})`)}
${referenceChecksHtml(referenceChecks)}

${part(facilities ? 8 : 7, 'AI cross-verification')}
${
  cc
    ? `<span class="verdict ${esc(cc.verdict)}">${esc(cc.verdict.replace(/_/g, ' '))}</span>
       <p class="body">${esc(cc.overview)}</p>
       ${ccFindings ? `<ul class="notes" style="margin-top:5px">${ccFindings}</ul>` : ''}
       <p class="muted" style="margin:5px 0 0">Checked ${dt(ob.crossCheckedAt)} — advisory only; originals verified by HR.</p>`
    : '<p class="muted">Not run.</p>'
}

${part(facilities ? 9 : 8, `Full history (${timeline.length} ${timeline.length === 1 ? 'entry' : 'entries'})`)}
${historyHtml(timeline)}

<div class="sig">
  <div>Prepared by (HR)</div>
  <div>Verified by</div>
  <div>Approved by</div>
</div>

<footer>
  <span>DBL HRM · ${esc(c.code)} · ${esc(c.name)}</span>
  <span>System records as at ${dt(new Date().toISOString())}</span>
</footer>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},250)})</script>
</body></html>`;

  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
