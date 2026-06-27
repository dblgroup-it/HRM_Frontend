import {
  LayoutDashboard,
  ClipboardList,
  ClipboardCheck,
  Stethoscope,
  Network,
  SlidersHorizontal,
  Plug,
  ShieldCheck,
  Sparkles,
  Users,
  UserSearch,
  Star,
  Bell,
  Settings,
  Briefcase,
  Search,
  type LucideIcon,
} from 'lucide-react';

import { ROUTES } from '@app/router/paths';
import type { UserRole } from '@modules/auth';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Optional role gating; omit to allow everyone. */
  roles?: UserRole[];
  /** Gate to recruitment roles (Corporate HR / CHRO / super user). */
  requiresRecruitment?: boolean;
  /** Gate to medical officers (and super users). */
  requiresMedical?: boolean;
  /** Gate to management / Corporate HR / CHRO / super (AI insights). */
  requiresInsights?: boolean;
  /** Optional short tag, e.g. phase marker. */
  badge?: string;
  /** Opens in a new browser tab instead of navigating inside the app. */
  external?: boolean;
}

export interface NavSection {
  heading: string;
  items: NavItem[];
}

export const NAVIGATION: NavSection[] = [
  {
    heading: 'Overview',
    items: [
      { label: 'Dashboard', to: ROUTES.dashboard, icon: LayoutDashboard },
      // {
      //   label: 'AI Insights',
      //   to: ROUTES.insights,
      //   icon: Sparkles,
      //   requiresInsights: true,
      //   badge: 'AI',
      // },
    ],
  },
  {
    heading: 'Recruitment',
    items: [
      { label: 'Organogram', to: ROUTES.organogram, icon: Network },
      {
        label: 'Requisitions',
        to: ROUTES.requisitions,
        icon: ClipboardList,
      },
      {
        label: 'Candidates',
        to: ROUTES.candidates,
        icon: UserSearch,
        requiresRecruitment: true,
      },
      {
        label: 'Talent Pool',
        to: ROUTES.talentPool,
        icon: Star,
        requiresRecruitment: true,
      },
    ],
  },
  {
    heading: 'My Work',
    items: [
      {
        label: 'My Interviews',
        to: ROUTES.myInterviews,
        icon: ClipboardCheck,
      },
      {
        label: 'Medical Clearance',
        to: ROUTES.medical,
        icon: Stethoscope,
        requiresMedical: true,
      },
    ],
  },
  {
    heading: 'People',
    items: [{ label: 'Employees', to: ROUTES.employees, icon: Users }],
  },
  {
    heading: 'Public Sites',
    items: [
      {
        label: 'Careers Page',
        to: ROUTES.careers,
        icon: Briefcase,
        external: true,
        badge: '↗',
      },
      {
        label: 'Application Tracker',
        to: ROUTES.applyStatus,
        icon: Search,
        external: true,
        badge: '↗',
      },
    ],
  },
  {
    heading: 'Configuration',
    items: [
      {
        label: 'Unit Config',
        to: ROUTES.unitConfig,
        icon: SlidersHorizontal,
        roles: ['admin', 'hr_manager'],
      },
      {
        label: 'Access Control',
        to: ROUTES.accessControl,
        icon: ShieldCheck,
        roles: ['admin'],
      },
      {
        label: 'AI Settings',
        to: ROUTES.aiSettings,
        icon: Sparkles,
        roles: ['admin'],
      },
      {
        label: 'Integrations',
        to: ROUTES.integrations,
        icon: Plug,
        roles: ['admin', 'hr_manager'],
      },
    ],
  },
  {
    heading: 'System',
    items: [
      {
        label: 'Settings',
        to: ROUTES.settings,
        icon: Settings,
        roles: ['admin', 'hr_manager'],
      },
      {
        label: 'Notifications',
        to: ROUTES.notifications,
        icon: Bell,
      },
    ],
  },
];
