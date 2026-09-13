import { printDocument } from '@shared/utils';

import type { SheetDetail, SheetRow } from '../types/board.types';

const money = (n: number | null) =>
  n == null
    ? ''
    : new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n);

/**
 * DBL's paper form, column for column.
 *
 * The spreadsheet export carries more (requisition code, approval chain, CV
 * link) and is built server-side with ExcelJS; this list is what goes on
 * paper, where a thirteenth column would not fit legibly.
 */
const PRINT_COLUMNS: { header: string; value: (r: SheetRow, i: number) => string }[] = [
  { header: 'SL', value: (_r, i) => String(i + 1) },
  { header: 'Name', value: (r) => r.name },
  { header: 'Position', value: (r) => r.position },
  { header: 'Department', value: (r) => r.department },
  { header: 'Unit', value: (r) => r.unit },
  { header: 'Education', value: (r) => r.education ?? '' },
  { header: 'Requirement', value: (r) => r.requirement },
  { header: 'Team', value: (r) => r.team },
  { header: 'Total Experience', value: (r) => r.totalExperience ?? '' },
  { header: 'Last Organization', value: (r) => r.lastOrganization ?? '' },
  { header: 'Salary', value: (r) => money(r.salary) },
  { header: 'Remark', value: (r) => r.remark },
];

const esc = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const dayOf = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

/**
 * Print one sheet on its own.
 *
 * Landscape, because twelve columns of DBL's paper form do not fit portrait at
 * a legible size — the @page here overrides the portrait default the shared
 * print shell sets.
 */
export function printSheet(sheet: SheetDetail): boolean {
  const body = sheet.rows
    .map(
      (r, i) => `
      <tr class="${i % 2 ? 'alt' : ''}">
        ${PRINT_COLUMNS.map(
          (c, ci) =>
            `<td class="${ci === 0 ? 'sl' : ci === 1 ? 'name' : ci === 6 ? 'mid' : ci === 10 ? 'num' : ''}">${esc(
              c.value(r, i),
            )}</td>`,
        ).join('')}
      </tr>${
        r.approvalChain
          ? `
      <tr class="chain ${i % 2 ? 'alt' : ''}"><td colspan="12"><span>Vacancy approved:</span> ${esc(r.approvalChain)}</td></tr>`
          : ''
      }`,
    )
    .join('');

  const votes = sheet.votes
    .map(
      (v) => `
      <tr>
        <td>${esc(v.name)}</td>
        <td class="mid">${esc(v.stage)}</td>
        <td class="mid ${v.status}">${esc(v.status)}</td>
        <td class="mid">${dayOf(v.respondedAt)}</td>
        <td>${v.notes ? esc(v.notes) : '—'}</td>
      </tr>`,
    )
    .join('');

  return printDocument(
    `
<style>
  @page { size: A4 landscape; margin: 11mm 9mm 14mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #12202f; font-size: 9.5px; }

  /* Masthead */
  .mast { display: flex; justify-content: space-between; align-items: flex-end;
          border-bottom: 2.5px solid #1877c0; padding-bottom: 7px; }
  .mast h1 { font-size: 14px; color: #1877c0; margin: 0; letter-spacing: .2px; }
  .mast .doc { font-size: 8px; text-transform: uppercase; letter-spacing: 1.1px;
               color: #8795a8; margin: 2px 0 0; }
  .mast .right { text-align: right; font-size: 9px; color: #5a6b7f; line-height: 1.6; }
  .mast .ref { font-size: 12px; font-weight: 700; color: #12202f; letter-spacing: .3px; }
  .pill { display: inline-block; padding: 1px 8px; border-radius: 99px; font-size: 8px;
          font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
          background: #eef4fa; color: #2b5c86; }
  .pill.approved { background: #dcfce7; color: #15803d; }
  .pill.rejected { background: #fee2e2; color: #b91c1c; }

  .lead { margin: 9px 0 8px; font-size: 9.5px; color: #4a5b6e; line-height: 1.6; }

  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }          /* repeat on every page */
  th { background: #1877c0; color: #fff; border: 1px solid #1668a8; padding: 5px 6px;
       font-size: 7.8px; text-transform: uppercase; letter-spacing: .4px; text-align: left; }
  td { border: 1px solid #dce4ee; padding: 5px 6px; vertical-align: top;
       word-wrap: break-word; line-height: 1.45; }
  tr.alt td { background: #f7fafd; }
  td.sl { text-align: center; color: #8795a8; }
  td.name { font-weight: 700; }
  td.mid { text-align: center; }
  td.num { text-align: right; font-weight: 700; white-space: nowrap; }
  tr.chain td { font-size: 8px; color: #5a6b7f; border-top: 0; padding-top: 0; }
  tr.chain span { color: #a3b0bf; }
  tr { page-break-inside: avoid; }

  h2 { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #4a5b6e;
       margin: 16px 0 5px; }
  table.votes th { background: #f2f7fb; color: #3d556e; border-color: #c9d6e6; }
  table.votes td.approved { color: #15803d; font-weight: 700; text-transform: capitalize; }
  table.votes td.rejected { color: #b91c1c; font-weight: 700; text-transform: capitalize; }
  table.votes td.pending  { color: #a16207; font-weight: 700; text-transform: capitalize; }

  .sign { display: flex; gap: 44px; margin-top: 30px; page-break-inside: avoid; }
  .sign div { flex: 1; border-top: 1px solid #4a5b6e; padding-top: 4px;
              text-align: center; font-size: 8.5px; color: #4a5b6e; }
  .foot { margin-top: 10px; border-top: 1px solid #e6ecf4; padding-top: 5px;
          display: flex; justify-content: space-between; font-size: 7.5px; color: #a3b0bf; }
</style>

<div class="mast">
  <div>
    <h1>DBL Group</h1>
    <p class="doc">Hiring Approval Sheet</p>
  </div>
  <div class="right">
    <span class="ref">${esc(sheet.reference)}</span><br>
    ${dayOf(sheet.createdAt)} &middot; prepared by ${esc(sheet.preparedBy)}<br>
    <span class="pill ${esc(sheet.status)}">${esc(sheet.status)}</span>
  </div>
</div>

<p class="lead">
  Approval is requested for the ${sheet.rows.length}
  appointment${sheet.rows.length === 1 ? '' : 's'} listed below. This sheet is
  approved or returned as a whole.
</p>

<table>
  <thead>
    <tr>${PRINT_COLUMNS.map((c) => `<th>${esc(c.header)}</th>`).join('')}</tr>
  </thead>
  <tbody>${body}</tbody>
</table>

${
  votes
    ? `<h2>Sign-off</h2>
<table class="votes">
  <thead><tr><th>Approver</th><th>Stage</th><th>Decision</th><th>Responded</th><th>Note</th></tr></thead>
  <tbody>${votes}</tbody>
</table>`
    : ''
}

<div class="sign"><div>Prepared by</div><div>CHRO</div><div>Board</div></div>
<div class="foot">
  <span>DBL HRM &middot; ${esc(sheet.reference)}</span>
  <span>System records as at ${dayOf(new Date().toISOString())}</span>
</div>`,
    `Hiring Approval Sheet ${sheet.reference}`,
  );
}
