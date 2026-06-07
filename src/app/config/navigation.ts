import {
  LayoutDashboard,
  ClipboardList,
  Network,
  SlidersHorizontal,
  Plug,
  ShieldCheck,
  Users,
  UserSearch,
  Bell,
  Settings,
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
  /** Optional short tag, e.g. phase marker. */
  badge?: string;
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
      { label: 'Candidates', to: ROUTES.candidates, icon: UserSearch },
    ],
  },
  {
    heading: 'People',
    items: [{ label: 'Employees', to: ROUTES.employees, icon: Users }],
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
