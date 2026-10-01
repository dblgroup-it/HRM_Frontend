import type { Requisition, RoleProfile } from './types/requisition.types';

/**
 * A role profile drafted from Factory HR's job analysis (section B).
 *
 * The job description, education and experience were already written by the
 * unit before approval, so after approval the role profile should start from
 * them rather than from a blank page. Lines of the job description become
 * responsibilities; education, experience and "others" become requirements.
 * Null when there is no job analysis to draw on.
 */
export function draftRoleProfile(
  req: Pick<
    Requisition,
    | 'designation'
    | 'department'
    | 'unitFactory'
    | 'placeOfPosting'
    | 'jobDescription'
    | 'education'
    | 'experience'
    | 'others'
  >
): RoleProfile | null {
  const jd = (req.jobDescription ?? '').trim();
  if (!jd) return null;

  const where = [req.department, req.unitFactory].filter(Boolean).join(', ');
  return {
    summary: `${req.designation}${where ? ` — ${where}` : ''}${
      req.placeOfPosting ? `, based at ${req.placeOfPosting}` : ''
    }.`,
    jobDescription: jd,
    responsibilities: pointsOf(jd),
    requirements: [
      ...pointsOf(req.education).map((l) => `Education: ${l}`),
      ...pointsOf(req.experience).map((l) => `Experience: ${l}`),
      ...pointsOf(req.others),
    ],
    generatedAt: new Date().toISOString(),
    generatedBy: 'job_analysis',
  };
}

/**
 * The separate points in a block of text: its lines when it is written as a
 * list (bullets, numbers or line breaks), otherwise its sentences.
 */
export function pointsOf(text: string | null | undefined): string[] {
  const t = (text ?? '').trim();
  if (!t) return [];
  const strip = (l: string) =>
    l.replace(/^\s*(?:[-•*▪●]|\d+[.)])\s*/, '').trim();
  const lines = t.split(/\r?\n/).map(strip).filter(Boolean);
  if (lines.length > 1) return lines;
  const sentences = lines[0]
    .split(/(?<=[.;])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim().replace(/[;]$/, ''))
    .filter(Boolean);
  return sentences.length ? sentences : lines;
}
