export type ReviewActor = {
  id: number;
  role: string;
};

export type ReviewableLeaveRequest = {
  employee_user_id: number;
  employee_role: string;
  reviewer_user_id: number | null;
  staff_reviewer: "manager" | "company_admin";
  manager_reviewer?: "manager" | "company_admin";
  department_manager_id: number | null;
  escalation_user_ids: number[];
};

const ROLE_PRIVILEGE: Record<string, number> = {
  staff: 1,
  manager: 2,
  company_admin: 3,
};

export function hasHigherPrivilege(
  actorRole: string,
  employeeRole: string,
): boolean {
  return (ROLE_PRIVILEGE[actorRole] ?? 0) > (ROLE_PRIVILEGE[employeeRole] ?? 0);
}

export function documentNotifyKind(input: {
  employeeUserId: number;
  employeeRole: string;
  departmentManager: { id: number; role: string } | null;
  companyAdminId: number | null;
}): "department_manager" | "company_admin" | null {
  const manager = input.departmentManager;
  if (
    manager &&
    manager.id !== input.employeeUserId &&
    hasHigherPrivilege(manager.role, input.employeeRole)
  ) {
    return "department_manager";
  }
  if (
    input.companyAdminId !== null &&
    input.companyAdminId !== input.employeeUserId
  ) {
    return "company_admin";
  }
  return null;
}

export function canReviewLeaveRequest(
  actor: ReviewActor,
  request: ReviewableLeaveRequest,
): boolean {
  if (request.employee_user_id === actor.id) return false;
  if (actor.role === "company_admin") return true;
  if (actor.role !== "manager") return false;
  if (request.escalation_user_ids.includes(actor.id)) return true;

  if (request.employee_role === "staff") {
    return (
      request.staff_reviewer === "manager" &&
      (request.reviewer_user_id === actor.id ||
        request.department_manager_id === actor.id)
    );
  }

  if (request.employee_role === "manager") {
    return (
      (request.manager_reviewer ?? "company_admin") === "manager" &&
      request.reviewer_user_id === actor.id
    );
  }

  return false;
}
