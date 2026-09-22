import type { Requisition } from './types/requisition.types';

const STOP = new Set([
  'and',
  'of',
  'the',
  'for',
  'in',
  'at',
  'to',
  'a',
  'an',
  'or',
]);

/** "Deputy Manager — Merchandising" → "#DeputyManagerMerchandising". */
function toTag(phrase?: string | null): string | null {
  const words = (phrase ?? '')
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w && !STOP.has(w.toLowerCase()));
  if (!words.length) return null;
  const tag = `#${words.map((w) => w[0].toUpperCase() + w.slice(1)).join('')}`;
  return tag.length <= 34 ? tag : null;
}

const lines = (v?: string | null) =>
  (v ?? '')
    .split('\n')
    .map((l) => l.trim().replace(/^[-•*·]\s*/, ''))
    .filter(Boolean);

/**
 * The vacancy, written the way it gets shared.
 *
 * Factory HR and the recruiters are asked for a vacancy in their own unit and
 * retype it into Facebook, LinkedIn and WhatsApp groups — and every retyping
 * is a chance for the designation, the closing date or the link to drift from
 * what the career page is actually showing. This builds it from the
 * requisition itself, so what gets pasted is what was posted.
 *
 * Deliberately built from the requisition alone, not from the BDJobs form:
 * that form lives behind the recruitment gate, and the people who share a
 * vacancy most are exactly the people who cannot open it.
 */
export function buildRequisitionSocialPost(
  req: Pick<
    Requisition,
    | 'designation'
    | 'designationLabel'
    | 'alternateDesignations'
    | 'unitFactory'
    | 'department'
    | 'placeOfPosting'
    | 'requiredPosts'
    | 'employmentNature'
    | 'education'
    | 'experience'
    | 'roleProfile'
    | 'posting'
  >,
  applyUrl: string,
): string {
  const title =
    req.designationLabel ||
    [req.designation, ...(req.alternateDesignations ?? [])]
      .filter(Boolean)
      .join(' / ');

  const out: string[] = [];
  out.push(`🚀 WE ARE HIRING — ${title.toUpperCase()}`);
  out.push(`🏢 DBL Group${req.unitFactory ? ` · ${req.unitFactory}` : ''}`);
  if (req.department) out.push(`🗂️ ${req.department}`);
  out.push('');

  const facts = [
    `👥 Vacancy: ${req.requiredPosts}`,
    req.placeOfPosting ? `📍 Location: ${req.placeOfPosting}` : null,
    req.employmentNature ? `📄 ${req.employmentNature.replace(/_/g, ' ')}` : null,
    req.education ? `🎓 ${req.education}` : null,
    req.experience ? `💼 ${req.experience}` : null,
  ].filter(Boolean) as string[];
  out.push(...facts);

  // The published role profile, when Head of Talent Acquisition has written
  // one — it is the copy meant for candidates, so it beats the internal JD.
  const responsibilities = req.roleProfile?.responsibilities ?? [];
  const summary = req.roleProfile?.summary?.trim();
  if (summary) {
    out.push('', summary);
  }
  if (responsibilities.length > 0) {
    out.push('', '🔧 What you will do:');
    out.push(...responsibilities.slice(0, 5).map((r) => `• ${r}`));
  } else {
    const jd = lines(req.roleProfile?.jobDescription).slice(0, 4);
    if (jd.length) {
      out.push('', '🔧 What you will do:');
      out.push(...jd.map((r) => `• ${r}`));
    }
  }

  const closes = req.posting?.closingDate;
  if (closes) {
    out.push(
      '',
      `⏳ Apply by ${new Date(closes).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}`,
    );
  }
  out.push('', `📩 Apply online: ${applyUrl}`);

  const tags = new Set(['#DBLGroup', '#WeAreHiring', '#Hiring']);
  for (const phrase of [req.designation, req.department, req.unitFactory]) {
    const tag = toTag(phrase);
    if (tag) tags.add(tag);
  }
  tags.add('#JobsInBangladesh');
  out.push('', [...tags].join(' '));

  return out.join('\n');
}
