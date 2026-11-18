import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLeaveReviewEvents } from "./reviewEvents.js";

const submittedAt = new Date("2026-11-17T09:00:00.000Z");

describe("buildLeaveReviewEvents", () => {
  it("returns a submission event for a pending request", () => {
    assert.deepEqual(
      buildLeaveReviewEvents({
        status: "pending",
        submitted_at: submittedAt,
        employee_name: "Sipho",
        reviewed_at: null,
        reviewer_name: null,
        decision_reason: null,
        cancelled_at: null,
      }),
      [{
        type: "submitted",
        at: submittedAt,
        actorName: "Sipho",
        reason: null,
      }],
    );
  });

  it("includes the saved decision, reviewer, and rejection reason", () => {
    const reviewedAt = new Date("2026-11-17T10:00:00.000Z");
    const events = buildLeaveReviewEvents({
      status: "rejected",
      submitted_at: submittedAt,
      employee_name: "Sipho",
      reviewed_at: reviewedAt,
      reviewer_name: "HR",
      decision_reason: "Insufficient coverage",
      cancelled_at: null,
    });

    assert.deepEqual(events.map((event) => event.type), ["submitted", "rejected"]);
    assert.equal(events[1].actorName, "HR");
    assert.equal(events[1].reason, "Insufficient coverage");
  });
});
