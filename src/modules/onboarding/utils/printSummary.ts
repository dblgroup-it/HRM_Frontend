import type { OnboardingResult } from '../types/onboarding.types';

const esc = (v: string | null | undefined): string =>
  (v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const d = (iso: string | null | undefined): string =>
  iso
    ? new Date(iso).toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

const row = (label: string, value: string): string =>
  `<tr><td class="k">${label}</td><td>${value || '—'}</td></tr>`;

/**
 * Opens a print-ready onboarding summary (for the hard-copy personnel file)
 * in a new window and triggers the browser's print dialog.
 */
export function printOnboardingSummary(data: OnboardingResult): void {
  const c = data.candidate;
  const ob = data.onboarding;
  if (!ob) return;

  const docsRows = ob.docs
    .map((doc) => {
      const fields = Object.entries(doc.aiExtract?.fields ?? {})
        .slice(0, 4)
        .map(([k, v]) => `${esc(k)}: ${esc(v)}`)
        .join(' · ');
      return `<tr>
        <td>${esc(doc.label)}</td>
        <td><span class="pill ${doc.status}">${doc.status}</span></td>
        <td>${d(doc.createdAt)}</td>
        <td class="small">${fields || '—'}</td>
      </tr>`;
    })
    .join('');

  const cc = ob.crossCheck;
  const ccFindings = (cc?.findings ?? [])
    .map(
      (f) =>
        `<li><b>[${esc(f.severity)}] ${esc(f.doc)}:</b> ${esc(f.detail)}</li>`,
    )
    .join('');

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Onboarding Summary — ${esc(c.name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 32px; font-size: 12px; line-height: 1.5; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1877c0; padding-bottom: 10px; margin-bottom: 18px; }
  h1 { font-size: 18px; margin: 0; color: #1877c0; }
  h2 { font-size: 13px; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: .04em; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 4px 8px; vertical-align: top; text-align: left; }
  table.kv td.k { width: 180px; color: #64748b; }
  table.docs { border: 1px solid #e2e8f0; }
  table.docs th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; color: #475569; }
  table.docs td { border-top: 1px solid #e2e8f0; }
  .pill { padding: 1px 8px; border-radius: 99px; font-size: 11px; font-weight: bold; }
  .pill.verified { background: #dcfce7; color: #15803d; }
  .pill.pending { background: #fef9c3; color: #a16207; }
  .pill.rejected { background: #fee2e2; color: #b91c1c; }
  .small { color: #64748b; font-size: 11px; }
  .verdict { padding: 8px 12px; border-radius: 8px; font-weight: bold; display: inline-block; }
  .verdict.consistent { background: #dcfce7; color: #15803d; }
  .verdict.minor_issues { background: #fef9c3; color: #a16207; }
  .verdict.discrepancies { background: #fee2e2; color: #b91c1c; }
  ul { margin: 6px 0 0; padding-left: 18px; }
  .sig { display: flex; gap: 40px; margin-top: 48px; }
  .sig div { flex: 1; border-top: 1px solid #334155; padding-top: 6px; text-align: center; color: #475569; }
  footer { margin-top: 24px; font-size: 10px; color: #94a3b8; }
  @media print { body { margin: 12mm; } .noprint { display: none; } }
</style></head><body>
<header>
  <div>
    <h1>DBL Group — Onboarding Summary</h1>
    <div class="small">Requisition ${esc(c.code)} · ${esc(c.designation)} · ${esc(c.unit)}${c.department ? ` · ${esc(c.department)}` : ''}</div>
  </div>
  <div class="small" style="text-align:right">Generated ${d(new Date().toISOString())}<br>Status: <b>${esc(ob.status.replace(/_/g, ' '))}</b></div>
</header>

<h2>Candidate</h2>
<table class="kv">
  ${row('Name', esc(c.name))}
  ${row('Email', esc(c.email))}
  ${row('Phone', esc(c.phone))}
  ${row('Pipeline stage', esc(c.stage.replace(/_/g, ' ')))}
  ${row('CV source', esc(c.source))}
  ${row(
    'AI CV match',
    c.matchScore != null
      ? `${c.matchScore}/100${c.matchSummary ? ` — ${esc(c.matchSummary)}` : ''}`
      : '—',
  )}
</table>

<h2>Joining documents (${ob.docs.length})</h2>
${
  ob.docs.length
    ? `<table class="docs"><tr><th>Document</th><th>Status</th><th>Submitted</th><th>AI-extracted details</th></tr>${docsRows}</table>`
    : '<p class="small">No documents submitted.</p>'
}

<h2>AI cross-verification</h2>
${
  cc
    ? `<span class="verdict ${esc(cc.verdict)}">${esc(cc.verdict.replace(/_/g, ' '))}</span>
       <p>${esc(cc.overview)}</p>${ccFindings ? `<ul>${ccFindings}</ul>` : ''}
       <p class="small">Checked ${d(ob.crossCheckedAt)} — advisory; originals verified by HR.</p>`
    : '<p class="small">Not run.</p>'
}

<h2>Lifecycle</h2>
<table class="kv">
  ${row('Offer sent', d(ob.offerSentAt))}
  ${row('Offer accepted', d(ob.offerAcceptedAt))}
  ${row(
    'Medical clearance',
    `${esc(ob.medicalStatus)}${ob.medicalClearedAt ? ` — ${d(ob.medicalClearedAt)}` : ''}${ob.medicalNote ? ` (${esc(ob.medicalNote)})` : ''}`,
  )}
  ${row('HR final verification', d(ob.hrVerifiedAt))}
  ${row(
    'IT provisioning',
    ob.itNotifiedAt
      ? `${d(ob.itNotifiedAt)} — email: ${esc(ob.itEmail) || '—'} · asset: ${esc(ob.itAssetId) || '—'}`
      : '—',
  )}
  ${row('Documents archived', d(ob.archivedAt))}
</table>

<div class="sig">
  <div>Prepared by (HR)</div>
  <div>Verified by</div>
  <div>Approved by</div>
</div>

<footer>Generated by DBL HRM · ${esc(c.code)} · This summary reflects system records at the time of printing.</footer>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},200)})</script>
</body></html>`;

  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
