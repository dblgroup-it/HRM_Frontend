import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { FullPageSpinner } from '@shared/components/ui';
import { DashboardLayout } from '@app/layouts';

import { ROUTES } from './paths';
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute';

// Code-split each module by route for a lean initial bundle.
const LoginPage = lazy(() => import('@modules/auth/pages/LoginPage'));
const DashboardPage = lazy(
  () => import('@modules/dashboard/pages/DashboardPage')
);

const OrganogramPage = lazy(
  () => import('@modules/organogram/pages/OrganogramPage')
);
const UnitConfigPage = lazy(
  () => import('@modules/units/pages/UnitConfigPage')
);
const IntegrationsPage = lazy(
  () => import('@modules/integrations/pages/IntegrationsPage')
);
const AccessControlPage = lazy(
  () => import('@modules/rbac/pages/AccessControlPage')
);
const AiSettingsPage = lazy(
  () => import('@modules/settings/pages/AiSettingsPage')
);

// Phase 1 · Manpower Requisition
const RequisitionsPage = lazy(
  () => import('@modules/requisition/pages/RequisitionsPage')
);
const RequisitionCreatePage = lazy(
  () => import('@modules/requisition/pages/RequisitionCreatePage')
);
const RequisitionDetailPage = lazy(
  () => import('@modules/requisition/pages/RequisitionDetailPage')
);

const CandidatesPage = lazy(
  () => import('@modules/recruitment/pages/RecruitmentPage')
);
const ApplyPage = lazy(() => import('@modules/candidates/pages/ApplyPage'));
const TalentPoolPage = lazy(
  () => import('@modules/candidates/pages/TalentPoolPage')
);
const MyInterviewsPage = lazy(
  () => import('@modules/assessment/pages/MyInterviewsPage')
);
const ExamPage = lazy(() => import('@modules/assessment/pages/ExamPage'));
const OnboardingPage = lazy(
  () => import('@modules/onboarding/pages/OnboardingPage')
);
const MedicalQueuePage = lazy(
  () => import('@modules/onboarding/pages/MedicalQueuePage')
);
const OnboardingManagePage = lazy(
  () => import('@modules/onboarding/pages/OnboardingManagePage')
);
const EmployeesPage = lazy(
  () => import('@modules/employees/pages/EmployeesPage')
);
const EmployeeDetailPage = lazy(
  () => import('@modules/employees/pages/EmployeeDetailPage')
);
const SettingsPage = lazy(
  () => import('@modules/settings/pages/SettingsPage')
);
const NotificationsPage = lazy(
  () => import('@modules/notifications/pages/NotificationsPage')
);
const NotFoundPage = lazy(() => import('@app/router/NotFoundPage'));

export function AppRouter() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        {/* Public */}
        <Route element={<PublicOnlyRoute />}>
          <Route path={ROUTES.login} element={<LoginPage />} />
        </Route>

        {/* Fully public — external candidates, no auth */}
        <Route path={ROUTES.apply()} element={<ApplyPage />} />
        <Route path="/exam/:token" element={<ExamPage />} />
        <Route path={ROUTES.onboarding()} element={<OnboardingPage />} />

        {/* Authenticated */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path={ROUTES.dashboard} element={<DashboardPage />} />

            <Route path={ROUTES.organogram} element={<OrganogramPage />} />
            <Route path={ROUTES.unitConfig} element={<UnitConfigPage />} />
            <Route
              path={ROUTES.accessControl}
              element={<AccessControlPage />}
            />
            <Route path={ROUTES.integrations} element={<IntegrationsPage />} />
            <Route path={ROUTES.aiSettings} element={<AiSettingsPage />} />

            <Route path={ROUTES.requisitions} element={<RequisitionsPage />} />
            <Route
              path={ROUTES.requisitionNew}
              element={<RequisitionCreatePage />}
            />
            <Route
              path={ROUTES.requisitionDetail()}
              element={<RequisitionDetailPage />}
            />

            <Route path={ROUTES.candidates} element={<CandidatesPage />} />
            <Route path={ROUTES.talentPool} element={<TalentPoolPage />} />
            <Route
              path={ROUTES.myInterviews}
              element={<MyInterviewsPage />}
            />
            <Route path={ROUTES.medical} element={<MedicalQueuePage />} />
            <Route
              path={ROUTES.onboardingManage()}
              element={<OnboardingManagePage />}
            />

            <Route path={ROUTES.employees} element={<EmployeesPage />} />
            <Route
              path={ROUTES.employeeDetail()}
              element={<EmployeeDetailPage />}
            />

            <Route path={ROUTES.settings} element={<SettingsPage />} />
            <Route
              path={ROUTES.notifications}
              element={<NotificationsPage />}
            />
          </Route>
        </Route>

        {/* Fallbacks */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
}
