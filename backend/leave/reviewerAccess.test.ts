import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canReviewLeaveRequest } from "./reviewerAccess.js";

const staffRequest = {
  employee_user_id: 10,
  employee_role: "staff",
  reviewer_user_id: 20,
  staff_reviewer: "manager" as const,
  department_manager_id: 20,
  escalation_user_ids: [],
};

describe("canReviewLeaveRequest", () => {
  it("denies managers when the company rule routes staff leave to HR", () => {
    assert.equal(
      canReviewLeaveRequest(
        { id: 20, role: "manager" },
        { ...staffRequest, staff_reviewer: "company_admin" },
      ),
      false,
    );
  });

  it("allows company admins when the company rule routes staff leave to HR", () => {
    assert.equal(
      canReviewLeaveRequest(
        { id: 30, role: "company_admin" },
        { ...staffRequest, staff_reviewer: "company_admin" },
      ),
      true,
    );
  });

  it("allows the configured department manager to review staff leave", () => {
    assert.equal(
      canReviewLeaveRequest({ id: 20, role: "manager" }, staffRequest),
      true,
    );
  });

  it("allows an escalation assignee without overriding the base reviewer rule", () => {
    assert.equal(
      canReviewLeaveRequest(
        { id: 30, role: "manager" },
        {
          ...staffRequest,
          staff_reviewer: "company_admin",
          escalation_user_ids: [30],
        },
      ),
      true,
    );
  });

  it("never allows a requester to review their own leave", () => {
    assert.equal(
      canReviewLeaveRequest(
        { id: 10, role: "company_admin" },
        staffRequest,
      ),
      false,
    );
  });
});
