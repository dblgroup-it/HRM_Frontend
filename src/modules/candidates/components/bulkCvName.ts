/**
 * "CV_Md_Rahim_Uddin (1).pdf" -> "Md Rahim Uddin".
 *
 * Mirrors `nameFromFileName` in HRM_Backend/src/modules/candidates/bulk-cv.ts,
 * which applies the same rule to any file sent without a name. The dialog
 * shows the result so the recruiter can correct it before uploading.
 */
const NOISE =
  /\b(cv|resume|curriculum vitae|biodata|bio data|updated|final|new|copy)\b/gi;

export function nameFromFileName(fileName: string): string {
  const cleaned = fileName
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/\(\d+\)/g, ' ')
    .replace(/[_\-.+]+/g, ' ')
    .replace(NOISE, ' ')
    .replace(/\d+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const titled = cleaned
    .split(' ')
    .map((w) =>
      w === w.toUpperCase() || w === w.toLowerCase()
        ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        : w,
    )
    .join(' ');
  return titled.length >= 2 ? titled.slice(0, 120) : 'Unnamed candidate';
}
