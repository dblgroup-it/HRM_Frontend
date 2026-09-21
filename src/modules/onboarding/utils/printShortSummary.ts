import logoUrl from '@assets/logo.png';
import {
  FACILITY_META,
  FACILITY_OPTION_LABEL,
} from '@modules/requisition/constants';
import { formatCurrency, resolveMediaUrl } from '@shared/utils';

import type { OnboardingCandidate, OnboardingResult } from '../types/onboarding.types';

const esc = (v: string | null | undefined): string =>
  (v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** "12 Sep 2026" — no clock time; this sheet is read at a glance. */
const day = (iso: string | null | undefined): string =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

/** DBL's pad footer, word for word as the letters print it. */
const ADDRESS_LINE =
  'Registered &amp; Corporate Office: Suit-4D, South Avenue Tower, House-50, Road-3, Gulshan-1, Dhaka-1212';
const CONTACT_LINE =
  'Tel: +880-2-58817735 &nbsp;·&nbsp; info@dbl-group.com &nbsp;·&nbsp; www.dbl-group.com';

/**
 * One field, or nothing at all.
 *
 * An empty value prints no row rather than a dash. A dash is a claim that
 * the field matters and has not been filled in; on a summary handed to
 * somebody arranging a desk, eight of them in a column is just noise, and
 * the reader has to scan past them to find the two lines that say anything.
 * The space the omitted rows free up goes to the remarks block, so the page
 * stays full either way.
 */
const field = (label: string, value: string): string =>
  value ? `<div class="f"><dt>${label}</dt><dd>${value}</dd></div>` : '';

/** A section is dropped whole when every field in it came back empty. */
const block = (
  title: string,
  body: string,
  opts: { cls?: string } = {},
): string =>
  body.replace(/\s/g, '')
    ? `<section${opts.cls ? ` class="${opts.cls}"` : ''}><h2>${title}</h2>${body}</section>`
    : '';

/**
 * One facility row — always all four, granted or not.
 *
 * Showing only what was granted made the block a different height for every
 * hire and quietly lost the useful negative: "no transport" is an answer the
 * person arranging a desk needs, and its absence reads as an oversight. Four
 * fixed rows also mean this column cannot change height, which is what keeps
 * the sheet to one page whatever is filled in.
 */
function facilityRow(
  label: string,
  f: {
    requested: boolean;
    option: string | null;
    vehicleType?: string | null;
    pickupLocation?: string | null;
    status: string;
  } | null,
): string {
  const granted = Boolean(f && (f.status === 'confirmed' || f.requested));
  const detail = f
    ? [
        f.option ? (FACILITY_OPTION_LABEL[f.option] ?? f.option) : null,
        f.vehicleType
          ? (FACILITY_OPTION_LABEL[f.vehicleType] ?? f.vehicleType)
          : null,
        f.pickupLocation ? `pick-up ${f.pickupLocation}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  const state =
    !f || (!f.requested && f.status !== 'confirmed')
      ? 'Not provided'
      : f.status === 'confirmed'
        ? 'Confirmed'
        : f.status === 'skipped'
          ? 'Withdrawn'
          : 'Requested';
  // The detail line is only shown for a facility they actually get. The
  // options carry defaults from the request form, so a facility nobody asked
  // for still holds one — printing it gives "Seating Arrangement · Existing
  // seat · NOT PROVIDED", which contradicts itself on one line. It is also
  // left off when it would only repeat the status pill beside it.
  return `<li class="${granted ? 'yes' : 'no'}">
    <span class="mark">${granted ? '✓' : '—'}</span>
    <span class="fl">
      <b>${esc(label)}</b>
      ${granted && detail ? `<i>${esc(detail)}</i>` : ''}
    </span>
    <span class="st">${esc(state)}</span>
  </li>`;
}

/**
 * Any same-origin image, inlined as a data URI.
 *
 * Both the logo and the candidate's photograph go through this. A printed
 * sheet cannot wait on a network fetch — Chrome will open the dialog with an
 * empty box where the picture should be — and the photo's URL is a
 * short-lived grant that would expire out of a saved PDF anyway.
 */
async function inlineImage(src: string): Promise<string> {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } catch {
    // A missing image must not cost the sheet — it prints without it.
    return '';
  }
}

/**
 * A one-page employee summary on DBL's pad.
 *
 * Deliberately not a shorter hiring record. The full record is the file: it
 * opens with the requisition and its approval chain and walks the whole
 * process. This sheet answers "who is this person and what have we given
 * them" — identity, placement, appointment terms, job location, facilities.
 * No approval chain, no document checklist, no step-by-step progress, because
 * none of that is what somebody arranging a desk, a car or a payroll record
 * needs to read.
 *
 * It holds one A4 sheet however much is filled in. Two things do that: every
 * block is a fixed set of rows rather than a list that can grow, and the
 * document measures itself once it has rendered and steps its zoom down until
 * it fits — the same trick the server's PDF renderer uses on letters. The
 * signature line is pushed to the foot of the page, so a sparse record still
 * looks like a finished document rather than one that ran out halfway.
 */
export async function printShortCandidateSummary(
  data: OnboardingResult,
): Promise<void> {
  const c: OnboardingCandidate = data.candidate;
  const ob = data.onboarding;

  // A popup opened after an await is usually blocked, so it is claimed first
  // and written to once the logo has been read.
  const win = window.open('', '_blank', 'width=900,height=1180');
  if (!win) return;

  // Both in parallel — neither is worth holding the dialog open for twice.
  const [logo, photo] = await Promise.all([
    inlineImage(logoUrl),
    c.photoUrl ? inlineImage(resolveMediaUrl(c.photoUrl) ?? '') : Promise.resolve(''),
  ]);

  // The level this person is actually hired at — a requisition raised at two
  // levels settles on one, and that is what belongs on their record.
  const designation = ob?.fixedDesignation?.trim() || c.designation;
  const initials = c.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const facilities = FACILITY_META.map(({ key, label }) =>
    facilityRow(label, c.facilities ? c.facilities[key] : null),
  ).join('');

  const benefits = (ob?.offerBenefits ?? []).filter(Boolean);
  const notes = (c.specialNotes ?? []).filter(Boolean);

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Employee Summary — ${esc(c.name)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, 'Segoe UI', Arial, Helvetica, sans-serif;
    color: #12202f; font-size: 12px; line-height: 1.5;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }

  /* The sheet is exactly A4 — not "at least" A4. The body between the
     letterhead and the signature line is what flexes, so the foot sits on
     the foot of the page for every record and the document always reads as
     finished rather than as text that stopped. */
  .sheet {
    width: 210mm; height: 297mm; margin: 0 auto; background: #fff;
    padding: 13mm 14mm 9mm; display: flex; flex-direction: column;
    overflow: hidden;
  }
  @media screen { body { background: #e8edf3; padding: 18px 0; }
                  .sheet { box-shadow: 0 6px 28px rgba(18,32,47,.16); } }
  /* Everything above the signature block, sized to the space available.
     Scaled with zoom rather than a transform, because zoom reflows: the
     column still fills the page width and the text re-wraps to it, where a
     transform would simply make the whole block wider than the paper. */
  .flow { flex: 1 1 auto; display: flex; flex-direction: column; min-height: 0; }

  /* ── Letterhead ── */
  .pad { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
  .lock { display: flex; align-items: center; gap: 11px; }
  .lock img { height: 50px; width: 50px; object-fit: contain; display: block; }
  .lock .wm { font-size: 21px; font-weight: 700; color: #1877c0;
              letter-spacing: -.3px; line-height: 1.1; }
  .lock .kind { font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
                text-transform: uppercase; color: #8795a8; margin-top: 2px; }
  .pad .meta { text-align: right; font-size: 9.5px; color: #7b8a9c; line-height: 1.75; }
  .pad .meta b { color: #12202f; font-size: 10.5px; }
  .rule { height: 2.5px; background: linear-gradient(90deg,#1877c0 0%,#1877c0 62%,#8cc63f 62%,#8cc63f 100%);
          margin: 10px 0 0; border-radius: 2px; }

  /* ── Identity band ── */
  .id {
    display: flex; align-items: center; gap: 16px; margin-top: 16px; flex: 0 0 auto;
    padding: 16px 18px; border: 1px solid #dde6f0; border-radius: 12px;
    background: linear-gradient(180deg,#f7fafd 0%,#eaf2fa 100%);
  }
  .av { width: 54px; height: 54px; border-radius: 13px; background: #1877c0; color: #fff;
        display: flex; align-items: center; justify-content: center; flex: 0 0 auto;
        font-size: 20px; font-weight: 700; letter-spacing: .5px; overflow: hidden; }
  /* The passport photograph they uploaded, cropped to the same square as the
     initials it replaces, so the header does not move when one is present. */
  .av img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .id .nm { flex: 1 1 auto; min-width: 0; }
  .id .nm h1 { margin: 0; font-size: 23px; font-weight: 700; letter-spacing: -.3px; line-height: 1.2; }
  .id .nm p  { margin: 3px 0 0; font-size: 12.5px; color: #52667c; }
  .eid { flex: 0 0 auto; text-align: right; padding-left: 16px; border-left: 1px solid #d5e1ee; }
  .eid span { display: block; font-size: 8.5px; font-weight: 700; letter-spacing: 1px;
              text-transform: uppercase; color: #8795a8; }
  .eid b { display: block; font-size: 21px; font-weight: 700; color: #1c4b72;
           font-variant-numeric: tabular-nums; letter-spacing: .4px; line-height: 1.25; }
  .eid .unset { font-size: 12px; font-weight: 600; color: #a3b0bf; }

  /* ── Body ── */
  .cols { display: grid; grid-template-columns: 1.24fr 1fr; column-gap: 20px;
          margin-top: 18px; flex: 0 0 auto; }
  .col { display: flex; flex-direction: column; gap: 16px; }

  h2 { margin: 0 0 9px; font-size: 9px; font-weight: 700; letter-spacing: 1.2px;
       text-transform: uppercase; color: #1877c0;
       padding-bottom: 5px; border-bottom: 1px solid #dde6f0; }

  dl { display: grid; grid-template-columns: 1fr 1fr; gap: 11px 18px; margin: 0; }
  dl.one { grid-template-columns: 1fr; }
  .f { min-width: 0; }
  .f dt { font-size: 8.5px; font-weight: 600; letter-spacing: .7px; text-transform: uppercase; color: #8795a8; }
  .f dd { margin: 2px 0 0; font-weight: 600; font-size: 12px; overflow-wrap: break-word; }
  /* An address is long and must not be hyphenated mid-word across a column. */
  .f dd.eml { font-size: 11px; letter-spacing: -.1px; }

  .card { border: 1px solid #e4ebf3; border-radius: 11px; padding: 14px 15px; background: #fbfcfe; }

  /* ── Facilities ── */
  ul.fac { list-style: none; margin: 0; padding: 0; }
  ul.fac li { display: grid; grid-template-columns: 17px 1fr auto; align-items: center;
              gap: 0 9px; padding: 8px 0; border-bottom: 1px dashed #e9eff6; }
  ul.fac li:last-child { border-bottom: 0; padding-bottom: 0; }
  ul.fac li:first-child { padding-top: 0; }
  ul.fac .mark { font-weight: 700; text-align: center; font-size: 12px; }
  ul.fac li.yes .mark { color: #2f9e44; }
  ul.fac li.no  .mark { color: #c6d2df; }
  ul.fac .fl { min-width: 0; }
  ul.fac .fl b { display: block; font-size: 11.5px; font-weight: 600; }
  ul.fac .fl i { display: block; font-style: normal; font-size: 10px; color: #7b8a9c;
                 overflow-wrap: anywhere; margin-top: 1px; }
  ul.fac li.no .fl b { color: #97a5b5; font-weight: 500; }
  ul.fac .st { font-size: 8px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase;
               padding: 3px 8px; border-radius: 99px; white-space: nowrap; }
  ul.fac li.yes .st { background: #e4f6e9; color: #1e7a34; }
  ul.fac li.no  .st { background: #f1f4f8; color: #97a5b5; }

  /* The block that makes the page whole.
     It takes whatever height is left over, so a sparse record does not trail
     off into white above the signature line and a full one still fits: it is
     the only thing here that is allowed to change size. It earns its place —
     every signed HR sheet ends up with something written on it by hand. */
  .remarks { flex: 1 1 auto; display: flex; flex-direction: column;
             min-height: 62px; margin-top: 18px; }
  .remarks .lines { flex: 1 1 auto; min-height: 42px; margin-top: 2px;
                    background-image: repeating-linear-gradient(
                      to bottom, transparent 0 21px, #e4ebf3 21px 22px); }

  ul.bul { margin: 0; padding-left: 15px; }
  ul.bul li { margin-bottom: 5px; }
  ul.bul li:last-child { margin-bottom: 0; }

  /* ── Foot ── */
  .foot { margin-top: auto; padding-top: 18px; flex: 0 0 auto; }
  .sig { display: flex; gap: 32px; }
  .sig div { flex: 1; border-top: 1px solid #5a6b7f; padding-top: 6px;
             text-align: center; font-size: 9.5px; color: #52667c; }
  .pad-foot { margin-top: 14px; padding-top: 8px; border-top: 1px solid #e4ebf3;
              text-align: center; font-size: 7.5px; color: #a3b0bf; line-height: 1.6; }
</style></head><body>
<div class="sheet" id="sheet">

  <div class="flow" id="flow">
  <div class="pad">
    <div class="lock">
      ${logo ? `<img src="${logo}" alt="DBL Group">` : ''}
      <div>
        <div class="wm">DBL Group</div>
        <div class="kind">Employee Summary · Group Corporate HR</div>
      </div>
    </div>
    <div class="meta">
      Requisition <b>${esc(c.code)}</b><br>
      Printed ${day(new Date().toISOString())}
    </div>
  </div>
  <div class="rule"></div>

  <div class="id">
    <div class="av">${
      photo
        ? `<img src="${photo}" alt="">`
        : esc(initials) || '&mdash;'
    }</div>
    <div class="nm">
      <h1>${esc(c.name)}</h1>
      <p>${esc(designation)}${c.department ? ` · ${esc(c.department)}` : ''} · ${esc(c.unit)}</p>
    </div>
    <div class="eid">
      <span>Employee ID</span>
      ${c.employeeId ? `<b>${esc(c.employeeId)}</b>` : '<b class="unset">Not assigned</b>'}
    </div>
  </div>

  <div class="cols">
    <div class="col">
      ${block(
        'Employee details',
        `<dl>
          ${field('Designation', esc(designation))}
          ${field('Department', esc(c.department))}
          ${field('Unit / company', esc(c.unit))}
          ${/* Name and code are their own fields: one is who to talk to and
                the other is what payroll and the org chart key on, and run
                together as "Name · 15105038 · Title" neither is scannable. */ ''}
          ${field('Line manager', esc(c.lineManagerName))}
          ${field('Line manager ID', esc(c.lineManagerCode))}
          ${c.email ? `<div class="f"><dt>Email</dt><dd class="eml">${esc(c.email)}</dd></div>` : ''}
          ${field('Phone', esc(c.phone))}
        </dl>
        ${
          ob?.offerJobLocation
            ? `<dl class="one" style="margin-top:11px">${field('Job location', esc(ob.offerJobLocation))}</dl>`
            : ''
        }`,
      )}

      ${block(
        'Appointment &amp; terms',
        `<dl>
          ${field('Job grade', esc(c.salaryJobGrade))}
          ${field('Fixed salary', c.proposedSalary != null ? esc(formatCurrency(c.proposedSalary)) : '')}
          ${field('Joining on or before', ob?.offerJoiningDate ? day(ob.offerJoiningDate) : '')}
          ${field('Expected joining', ob?.offerJoiningTentative ? day(ob.offerJoiningTentative) : '')}
          ${field('Probation', ob?.offerProbationMonths != null ? `${ob.offerProbationMonths} months` : '')}
          ${field('Notice period', ob?.offerNoticeDays != null ? `${ob.offerNoticeDays} days` : '')}
          ${field('Offer reference', esc(ob?.offerRef))}
          ${field('Appointment reference', esc(ob?.appointmentRef))}
        </dl>`,
      )}

      ${block(
        'Special terms',
        notes.length
          ? `<ul class="bul">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`
          : '',
      )}
    </div>

    <div class="col">
      <section class="card">
        <h2>Facilities</h2>
        <ul class="fac">${facilities}</ul>
      </section>

      ${block(
        'Benefits',
        benefits.length
          ? `<ul class="bul">${benefits.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`
          : '',
        { cls: 'card' },
      )}
    </div>
  </div>

  <section class="remarks">
    <h2>HR remarks</h2>
    <div class="lines"></div>
  </section>
  </div><!-- /flow -->

  <div class="foot" id="foot">
    <div class="sig">
      <div>Prepared by (Corporate HR)</div>
      <div>Verified by</div>
      <div>Employee signature</div>
    </div>
    <div class="pad-foot">
      ${ADDRESS_LINE}<br>${CONTACT_LINE}
    </div>
  </div>
</div>

<script>
  /**
   * Fill exactly one page, whatever is filled in.
   *
   * A record with every field set and five benefits listed needs more room
   * than a fresh hire with an employee ID and nothing else, and a fixed type
   * scale cannot serve both: pick a size for the full one and the sparse one
   * is a third of a page of text floating above a signature line.
   *
   * So the body measures itself once and scales to the space between the
   * letterhead and the signature block — down when it overflows, up when it
   * would otherwise leave the page half empty. Clamped either way: past about
   * 1.2 it reads as enlarged rather than designed, and below 0.8 it stops
   * being comfortable to read. The signature block is outside the scaled
   * area, so it stays put on the foot of the page at any scale.
   */
  (function () {
    var sheet = document.getElementById('sheet');
    var flow = document.getElementById('flow');
    var foot = document.getElementById('foot');
    function height(el) {
      return el.getBoundingClientRect().height;
    }
    function available() {
      var cs = getComputedStyle(sheet);
      return (
        sheet.clientHeight -
        parseFloat(cs.paddingTop) -
        parseFloat(cs.paddingBottom) -
        height(foot)
      );
    }
    function fit() {
      if (available() <= 0) return;
      // Spare room is already taken care of — the remarks block grows into
      // it. All that is left is the other direction: a record with every
      // field set and a long benefits list can overrun, and the type steps
      // down until it does not. Only ever downwards; magnifying a sparse
      // sheet narrows every column in content terms, and an address that
      // wrapped once starts wrapping four times. Bigger text is not the
      // same thing as a better-composed page.
      flow.style.zoom = '1';
      var k = 1;
      for (
        var i = 0;
        i < 30 && k > 0.8 && flow.scrollHeight > flow.clientHeight + 1;
        i++
      ) {
        k -= 0.02;
        flow.style.zoom = String(k);
      }
    }
    fit();
    window.addEventListener('load', function () {
      fit();
      setTimeout(function () { window.print(); }, 350);
    });
  })();
</script>
</body></html>`;

  win.document.write(html);
  win.document.close();
}
