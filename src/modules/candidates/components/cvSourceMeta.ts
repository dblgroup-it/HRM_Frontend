import {
  Briefcase,
  Building2,
  Database,
  Globe,
  GraduationCap,
  Linkedin,
  Share2,
  Star,
  UserSearch,
  type LucideIcon,
} from 'lucide-react';

// By path, not the barrel: the requisition barrel already imports this module.
import { CV_SOURCE_LABEL } from '@modules/requisition/constants';
import type { CvSource } from '@modules/requisition/types/requisition.types';

/**
 * How each CV source looks: an icon and a tint, so a pipeline shows at a
 * glance where its candidates came from. Its own module because the
 * components that render it must export only components (Fast Refresh).
 */
export const CV_SOURCE_META: Record<
  CvSource,
  { icon: LucideIcon; tone: string }
> = {
  linkedin: { icon: Linkedin, tone: 'border-sky-200 bg-sky-50 text-sky-700' },
  bdjobs: { icon: Briefcase, tone: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
  head_hunting: { icon: UserSearch, tone: 'border-amber-200 bg-amber-50 text-amber-800' },
  social_media: { icon: Share2, tone: 'border-pink-200 bg-pink-50 text-pink-700' },
  career_site: { icon: Globe, tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  campus: { icon: GraduationCap, tone: 'border-violet-200 bg-violet-50 text-violet-700' },
  internal_posting: { icon: Building2, tone: 'border-slate-300 bg-slate-50 text-slate-700' },
  cv_bank: { icon: Database, tone: 'border-teal-200 bg-teal-50 text-teal-700' },
  talent_pool: { icon: Star, tone: 'border-yellow-200 bg-yellow-50 text-yellow-800' },
};

/** Label, icon and tint for a stored key — null for an unknown one. */
export function cvSourceDisplay(key: string | null | undefined) {
  if (!key) return null;
  const meta = CV_SOURCE_META[key as CvSource];
  if (!meta) return null;
  return { label: CV_SOURCE_LABEL[key as CvSource], ...meta };
}
