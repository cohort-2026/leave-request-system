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
