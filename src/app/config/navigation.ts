import {
  Bell,
  Briefcase,
  ClipboardCheck,
  ClipboardList,
  FileSpreadsheet,
  GitBranch,
  History,
  LayoutDashboard,
  Network,
  Plug,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Stethoscope,
  HeartPulse,
  UserCheck,
  UserSearch,
  Users,
  UsersRound,
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
  /** Gate to recruitment roles (Head of Talent Acquisition / CHRO / super user). */
  requiresRecruitment?: boolean;
  /** Candidates & Talent Bank — also open to Corporate Recruiters. */
  requiresPipeline?: boolean;
  /** Gate to medical officers (and super users). */
  requiresMedical?: boolean;
  /** Central Medical Officer only — the approval queue. */
  requiresMedicalApproval?: boolean;
  /**
   * Hidden from someone whose only roles are medical.
   *
   * A Medical Officer or CMO holding no recruitment role cannot raise, approve
   * or recruit, so the Organogram and the Requisitions list are a wall of other
   * people's work with nothing on them to act on.
   */
  hideForMedicalOnly?: boolean;
  /** Only for people actually holding interview delegations right now. */
  requiresDelegations?: boolean;
  /** Factory HR Head (or super user) — first-interview finalist approvals. */
  requiresFirstInterviewApproval?: boolean;
  /** Gate to management / Head of Talent Acquisition / CHRO / super (AI insights). */
  requiresInsights?: boolean;
  /** Gate to Head of Talent Acquisition / CHRO / Factory HR / SBU Head for their unit(s) / super. */
  requiresUnitConfig?: boolean;
  /** Gate to Head of Talent Acquisition / CHRO / super (both GLOBAL roles). */
  requiresAiSettings?: boolean;
  /** Gate to Head of Talent Acquisition / CHRO / super — who signs off, per unit. */
  requiresApprovalPaths?: boolean;
  /** Gate to the platform administrator or a super user. */
  requiresAccessControl?: boolean;
  /** Head of Talent Acquisition (corporate_hr) or a super user. */
  requiresTalentHead?: boolean;
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
      {
        label: 'Organogram',
        to: ROUTES.organogram,
        icon: Network,
        hideForMedicalOnly: true,
      },
      {
        label: 'Requisitions',
        to: ROUTES.requisitions,
        icon: ClipboardList,
        hideForMedicalOnly: true,
      },
      {
        label: 'Candidates',
        to: ROUTES.candidates,
        icon: UserSearch,
        requiresPipeline: true,
      },
      {
        label: 'Talent Bank',
        to: ROUTES.talentPool,
        icon: Star,
        requiresPipeline: true,
      },
      {
        label: 'Approval Sheets',
        to: ROUTES.approvalSheets,
        icon: FileSpreadsheet,
        requiresRecruitment: true,
      },
      {
        label: 'Medical Requests',
        to: ROUTES.medicalRequests,
        icon: HeartPulse,
        requiresTalentHead: true,
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
        label: 'Assigned Candidates',
        to: ROUTES.assignedCandidates,
        icon: UserCheck,
        requiresDelegations: true,
      },
      {
        label: 'First Interview Approvals',
        to: ROUTES.firstInterviewApprovals,
        icon: UserCheck,
        requiresFirstInterviewApproval: true,
      },
      {
        label: 'Medical Clearance',
        to: ROUTES.medical,
        icon: Stethoscope,
        requiresMedical: true,
      },
      {
        label: 'Medical Approvals',
        to: ROUTES.medicalApprovals,
        icon: ShieldCheck,
        requiresMedicalApproval: true,
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
        requiresUnitConfig: true,
      },
      {
        label: 'Approval Paths',
        to: ROUTES.approvalPaths,
        icon: GitBranch,
        requiresApprovalPaths: true,
      },
      {
        label: 'System Activity',
        to: ROUTES.activityLog,
        icon: History,
        requiresAccessControl: true,
      },
      {
        label: 'Access Control',
        to: ROUTES.accessControl,
        icon: ShieldCheck,
        requiresAccessControl: true,
      },
      {
        label: 'AI Settings',
        to: ROUTES.aiSettings,
        icon: Sparkles,
        requiresAiSettings: true,
      },
      {
        label: 'Integrations',
        to: ROUTES.integrations,
        icon: Plug,
        // Platform administrator only — ZingHR sync, Google OAuth and BDJobs
        // credentials are account-level settings, not per-role ones.
        roles: ['admin'],
      },
      {
        label: 'Board Groups',
        to: ROUTES.boardGroups,
        icon: UsersRound,
        requiresRecruitment: true,
      },
      {
        label: 'AI Proficiency Bank',
        to: ROUTES.aiProficiencyBank,
        icon: ClipboardCheck,
        requiresRecruitment: true,
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
