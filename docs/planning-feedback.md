# LEAVE REQUEST SYSTEM
## Enhancement Requirements & Workflow

**Prepared:** 25 August 2026

---

## 1. Overview

The proposed enhancements are intended to make the leave management platform more efficient for employees and administrators while also preparing the system for use by multiple companies. The enhancements focus on three core capabilities: accurate working-day calculation, employee self-onboarding, and a multi-company platform structure.

## 2. Enhancement Objectives

- Automatically calculate the total number of working days for every leave request.
- Allow employees to onboard themselves through a company-specific registration link.
- Build the platform so that multiple companies can use it securely and independently.
- Reduce manual administration and improve the accuracy of leave records.
- Create a foundation that can support additional HR and leave-management features in future.

## 3. Enhancement 1 — Working-Day Calculation Workflow

The platform must automatically calculate the number of working days between the selected leave start and end dates. The calculation should be performed by the system rather than requiring the employee or administrator to calculate the duration manually.

### 3.1 Workflow

| Step | Action | System Behaviour |
|---|---|---|
| 1 | Select leave dates | Employee selects the leave start date and end date. |
| 2 | Validate dates | System checks that the dates are valid and that the end date is not before the start date. |
| 3 | Calculate working days | System counts applicable working days between the two dates. |
| 4 | Exclude non-working days | Weekends and configured public holidays are excluded. |
| 5 | Display result | The total number of working days is shown before submission. |
| 6 | Store calculation | The calculated number of days is saved with the leave request. |
| 7 | Use in approval | The manager/HR user sees the same calculation when reviewing the request. |

### 3.2 Example

| Field | Value |
|---|---|
| Leave Start Date | Tuesday, 1 September 2026 |
| Leave End Date | Monday, 7 September 2026 |
| Weekend Days | Saturday and Sunday excluded |
| Total Working Days | 5 days |

### 3.3 Business Rules

- Saturday and Sunday must not be counted as working days unless the company's working calendar says otherwise.
- Configured public holidays must not be counted as working days.
- The system must prevent invalid date ranges.
- The calculated working-day total must be visible before the employee submits the request.
- The stored calculation must remain available to managers and HR during approval and reporting.
- The company must be able to configure its working calendar and public holidays.

## 4. Enhancement 2 — Employee Self-Onboarding

The platform should provide a company-specific onboarding link that employees can use to create their own accounts. This reduces the amount of manual employee creation performed by HR or administrators.

### 4.1 Onboarding Workflow

1. Company Administrator/HR generates an onboarding link for the company.
2. The company distributes the link to its employees.
3. Employee opens the link and starts registration.
4. Employee provides the required information, such as name, surname, employee number, email address, department and position.
5. System validates the employee information and confirms that the employee belongs to the selected company.
6. Employee creates login credentials and completes registration.
7. System creates the employee profile under the correct company.
8. Employee logs in and can access the leave-management functions available to them.

### 4.2 Security and Control

- Each onboarding link must be associated with a specific company.
- Employees must not be able to register themselves under another company.
- The company should be able to disable or regenerate an onboarding link.
- Email verification should be supported.
- The system should prevent duplicate employee accounts.
- Employee access must be controlled by the employee's assigned role and company.

## 5. Enhancement 3 — Multi-Company Platform

The leave platform should be designed as a multi-company system rather than being tied to one organisation. Each company should have its own users, policies, departments, leave data and configuration while using the same application.

### 5.1 Company Structure

- Company profile
- Employees
- Departments
- Managers
- Leave types
- Leave policies
- Working calendar
- Public holidays
- Leave balances
- Leave applications
- Approval workflows
- Company-specific onboarding link

### 5.2 Data Separation

Data must be separated by company. An employee, manager or administrator must only be able to access information permitted for their company and role.

| Area | Company A | Company B | Expected Behaviour |
|---|---|---|---|
| Employees | 500 | 100 | Each company sees only its own employees |
| Departments | 20 | 8 | Departments are company-specific |
| Leave Policies | Policy A | Policy B | Each company controls its own policies |
| Public Holidays | Calendar A | Calendar B | Company calendars can differ |

### 5.3 Roles in the Multi-Company Model

| Role | Main Responsibility | Company Scope | Key Access |
|---|---|---|---|
| Employee | Submit and manage own leave | Own company | Own profile, leave requests and balance |
| Manager | Review employee leave | Own company | Assigned employees and approvals |
| HR/Admin | Manage company configuration | Own company | Employees, policies, calendars and reports |
| Platform Admin | Manage the platform | All companies | Company creation and platform administration |

## 6. Recommended End-to-End Workflow

Company Registration → Company Setup → Generate Onboarding Link → Employee Self-Onboarding → Employee Applies for Leave → System Calculates Working Days → Manager Reviews → Approve/Reject → Leave Balance Updated

## 7. Functional Requirements

| ID | Requirement |
|---|---|
| FR-01 | The system shall calculate working days automatically between leave start and end dates. |
| FR-02 | The system shall exclude weekends according to the company's configured working calendar. |
| FR-03 | The system shall support company-specific public holidays. |
| FR-04 | The system shall display the calculated working-day total before leave submission. |
| FR-05 | The system shall store the calculated working-day total with the leave application. |
| FR-06 | The system shall allow an authorised company administrator to generate an employee onboarding link. |
| FR-07 | The system shall associate each onboarding link with one company. |
| FR-08 | The system shall prevent duplicate employee accounts. |
| FR-09 | The system shall allow multiple companies to use the same platform. |
| FR-10 | The system shall isolate company data and restrict access according to company and role. |

## 8. Future Readiness

The platform should be designed so these enhancements do not require the application to be rebuilt later. The company structure, employee records, leave types, working calendars and approval workflows should be configurable from the beginning.

- Payroll and HR-system integrations
- Email and in-platform notifications
- Mobile application
- Advanced leave reports and dashboards
- Employee document management
- Additional approval levels
- Company-specific leave policies

## 9. Acceptance Criteria

- An employee can select leave dates and receive an accurate working-day calculation before submitting.
- Weekends and configured public holidays are excluded from the calculation.
- An authorised company user can generate an onboarding link.
- An employee can use the link to create an account under the correct company.
- Two or more companies can use the platform independently.
- Users cannot access another company's employee or leave information.
- Company-specific leave policies and working calendars can be maintained separately.

## 10. Summary

These three enhancements strengthen the leave platform by improving calculation accuracy, reducing manual onboarding work, and turning the solution into a reusable product that can support multiple organisations. The multi-company foundation should be considered a core architectural requirement from the beginning so that future companies can be added without redesigning the system.
