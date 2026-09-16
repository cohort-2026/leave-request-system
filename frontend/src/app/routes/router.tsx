import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { PendingLayout } from '../layouts/PendingLayout'
import { PublicLayout } from '../layouts/PublicLayout'
import { NotFoundPage } from '../NotFoundPage'
import { LegalPage } from '../LegalPage'
import { GuestOnly, RequireActive, RequireRole, SessionGate } from './guards'
import { ForbiddenPage } from '../../features/auth/pages/ForbiddenPage'
import { LoginPage } from '../../features/auth/pages/LoginPage'
import { ForgotPasswordPage } from '../../features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '../../features/auth/pages/ResetPasswordPage'
import { RegisterPage } from '../../features/auth/pages/RegisterPage'
import { JoinInvitePage } from '../../features/auth/pages/JoinInvitePage'
import { WhatToExpectPage } from '../../features/auth/pages/WhatToExpectPage'
import { LandingPage } from '../../features/auth/pages/LandingPage'
import { OnboardDisabledPage } from '../../features/auth/pages/OnboardDisabledPage'
import { OnboardPage } from '../../features/auth/pages/OnboardPage'
import { PendingApprovalPage } from '../../features/auth/pages/PendingApprovalPage'
import { VerifyPage } from '../../features/auth/pages/VerifyPage'
import { CalendarPage } from '../../features/calendar/pages/CalendarPage'
import { BlocksPage } from '../../features/company/pages/BlocksPage'
import { CalendarSettingsPage } from '../../features/company/pages/CalendarSettingsPage'
import { LeaveTypesPage } from '../../features/company/pages/LeaveTypesPage'
import { OnboardingLinkPage } from '../../features/company/pages/OnboardingLinkPage'
import { RulesPage } from '../../features/company/pages/RulesPage'
import { HomePage } from '../../features/leave/pages/HomePage'
import { LeaveDetailPage } from '../../features/leave/pages/LeaveDetailPage'
import { LeaveListPage } from '../../features/leave/pages/LeaveListPage'
import { NewLeavePage } from '../../features/leave/pages/NewLeavePage'
import { TeamQueuePage } from '../../features/leave/pages/TeamQueuePage'
import { TeamReviewPage } from '../../features/leave/pages/TeamReviewPage'
import { ApprovalsPage } from '../../features/people/pages/ApprovalsPage'
import { DepartmentsPage } from '../../features/people/pages/DepartmentsPage'
import { ImportPage } from '../../features/people/pages/ImportPage'
import { UserDetailPage } from '../../features/people/pages/UserDetailPage'
import { UsersPage } from '../../features/people/pages/UsersPage'
import { CompaniesPage } from '../../features/platform/pages/CompaniesPage'
import { NewCompanyPage } from '../../features/platform/pages/NewCompanyPage'
import { paths } from '../../shared/constants/paths'

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: paths.welcome, element: <LandingPage /> },
          { path: paths.login, element: <LoginPage /> },
          { path: paths.forgotPassword, element: <ForgotPasswordPage /> },
          { path: paths.resetPassword, element: <ResetPasswordPage /> },
          { path: paths.register, element: <RegisterPage /> },
          { path: paths.joinInvite, element: <JoinInvitePage /> },
          { path: paths.whatToExpect, element: <WhatToExpectPage /> },
        ],
      },
      { path: paths.terms, element: <LegalPage /> },
      { path: paths.privacy, element: <LegalPage /> },
      { path: paths.security, element: <LegalPage /> },
      { path: paths.dpa, element: <LegalPage /> },
      { path: paths.onboardDisabled, element: <OnboardDisabledPage /> },
      { path: paths.onboard, element: <OnboardPage /> },
      { path: paths.verify, element: <VerifyPage /> },
    ],
  },
  {
    element: <SessionGate />,
    children: [
      {
        element: <PendingLayout />,
        children: [
          { path: paths.pendingApproval, element: <PendingApprovalPage /> },
        ],
      },
      {
        element: <RequireActive />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: paths.forbidden, element: <ForbiddenPage /> },
              { path: paths.home, element: <HomePage /> },
              {
                element: (
                  <RequireRole allow={['staff', 'manager', 'company_admin']} />
                ),
                children: [
                  { path: paths.leave, element: <LeaveListPage /> },
                  { path: paths.leaveNew, element: <NewLeavePage /> },
                  { path: paths.leaveDetail, element: <LeaveDetailPage /> },
                  { path: paths.calendar, element: <CalendarPage /> },
                ],
              },
              {
                element: <RequireRole allow={['manager', 'company_admin']} />,
                children: [
                  { path: paths.teamQueue, element: <TeamQueuePage /> },
                  { path: paths.teamReview, element: <TeamReviewPage /> },
                ],
              },
              {
                element: <RequireRole allow={['company_admin']} />,
                children: [
                  { path: paths.adminUsers, element: <UsersPage /> },
                  { path: paths.adminUser, element: <UserDetailPage /> },
                  { path: paths.adminApprovals, element: <ApprovalsPage /> },
                  { path: paths.adminRules, element: <RulesPage /> },
                  { path: paths.adminImport, element: <ImportPage /> },
                  { path: paths.adminDepartments, element: <DepartmentsPage /> },
                  { path: paths.adminLeaveTypes, element: <LeaveTypesPage /> },
                  {
                    path: paths.adminCalendarSettings,
                    element: <CalendarSettingsPage />,
                  },
                  { path: paths.adminBlocks, element: <BlocksPage /> },
                  { path: paths.adminOnboarding, element: <OnboardingLinkPage /> },
                ],
              },
              {
                element: <RequireRole allow={['platform']} />,
                children: [
                  { path: paths.platform, element: <CompaniesPage /> },
                  {
                    path: paths.platformNewCompany,
                    element: <NewCompanyPage />,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
