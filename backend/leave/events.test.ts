import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACTION_BY_TYPE,
  TYPE_BY_ACTION,
  toPublicLeaveEvent,
  type LeaveEventType,
} from "./events.js";

describe("leave request event mapping", () => {
  it("maps helper types onto leave_request_events action names", () => {
    const expected: Record<LeaveEventType, string> = {
      submit: "submitted",
      edit: "edited",
      approve: "approved",
      decline: "declined",
      withdraw: "withdrawn",
      auto_approve: "auto_approved",
      document_view: "document_viewed",
    };
    assert.deepEqual(ACTION_BY_TYPE, expected);
  });

  it("maps stored actions back to helper types", () => {
    assert.equal(TYPE_BY_ACTION.submitted, "submit");
    assert.equal(TYPE_BY_ACTION.auto_approved, "auto_approve");
    assert.equal(TYPE_BY_ACTION.document_viewed, "document_view");
  });

  it("exposes before, after, balanceDelta and actor name on GET events[]", () => {
    const event = toPublicLeaveEvent({
      id: 12,
      action: "approved",
      details: {
        before: { status: "pending" },
        after: { status: "approved" },
        balanceDelta: -2.5,
      },
      created_at: new Date("2026-11-18T10:00:00.000Z"),
      actor_user_id: 3,
      actor_name: "Acme Admin",
    });
    assert.deepEqual(event, {
      id: "12",
      type: "approve",
      before: { status: "pending" },
      after: { status: "approved" },
      balanceDelta: -2.5,
      createdAt: new Date("2026-11-18T10:00:00.000Z"),
      actorUserId: 3,
      actorName: "Acme Admin",
    });
  });
});
