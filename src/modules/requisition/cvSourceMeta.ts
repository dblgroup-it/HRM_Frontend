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

import { CV_SOURCE_LABEL } from './constants';
import type { CvSource } from './types/requisition.types';

/**
 * How each CV source looks: an icon, a tint and a one-line hint — the same on
 * the requisition's source picker, the upload dialogs and every candidate
 * row, so a source is recognised by its mark wherever it appears. Its own
 * module because the components that render it must export only components
 * (Fast Refresh).
 */
export const CV_SOURCE_META: Record<
  CvSource,
  {
    icon: LucideIcon;
    /** Chip / selected-tile tint: border, background, text. */
    tone: string;
    /** The icon's own badge: solid colour, white mark. */
    badge: string;
    hint: string;
  }
> = {
  linkedin: {
    icon: Linkedin,
    tone: 'border-sky-200 bg-sky-50 text-sky-700',
    badge: 'bg-[#0a66c2] text-white',
    hint: 'Professional network',
  },
  bdjobs: {
    icon: Briefcase,
    tone: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    badge: 'bg-indigo-600 text-white',
    hint: 'Job portal',
  },
  head_hunting: {
    icon: UserSearch,
    tone: 'border-amber-200 bg-amber-50 text-amber-800',
    badge: 'bg-amber-500 text-white',
    hint: 'Agency search',
  },
  social_media: {
    icon: Share2,
    tone: 'border-pink-200 bg-pink-50 text-pink-700',
    badge: 'bg-pink-500 text-white',
    hint: 'Facebook, groups & pages',
  },
  career_site: {
    icon: Globe,
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    badge: 'bg-emerald-600 text-white',
    hint: 'DBL careers page',
  },
  campus: {
    icon: GraduationCap,
    tone: 'border-violet-200 bg-violet-50 text-violet-700',
    badge: 'bg-violet-600 text-white',
    hint: 'Universities & institutes',
  },
  internal_posting: {
    icon: Building2,
    tone: 'border-slate-300 bg-slate-50 text-slate-700',
    badge: 'bg-slate-600 text-white',
    hint: 'Current DBL employees',
  },
  cv_bank: {
    icon: Database,
    tone: 'border-teal-200 bg-teal-50 text-teal-700',
    badge: 'bg-teal-600 text-white',
    hint: 'CVs already on file',
  },
  talent_pool: {
    icon: Star,
    tone: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    badge: 'bg-yellow-500 text-white',
    hint: 'Past strong candidates',
  },
};

/** Label, icon and tint for a stored key — null for an unknown one. */
export function cvSourceDisplay(key: string | null | undefined) {
  if (!key) return null;
  const meta = CV_SOURCE_META[key as CvSource];
  if (!meta) return null;
  return { label: CV_SOURCE_LABEL[key as CvSource], ...meta };
}
