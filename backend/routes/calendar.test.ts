import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.DATABASE_URL ??= "postgres://localhost/calendar-tests";
const { monthRange, toCalendarLeaves } = await import("./calendar.js");

describe("calendar response ranges", () => {
  it("expands a valid month into inclusive date bounds", () => {
    assert.deepEqual(monthRange("2026-12"), {
      from: "2026-12-01",
      to: "2026-12-31",
    });
    assert.deepEqual(monthRange("2024-02"), {
      from: "2024-02-01",
      to: "2024-02-29",
    });
  });

  it("rejects malformed or impossible months", () => {
    assert.equal(monthRange("2026-13"), null);
    assert.equal(monthRange("2026-2"), null);
    assert.equal(monthRange("0000-01"), null);
  });

  it("preserves concurrent leave ranges and hides colleague leave types from staff", () => {
    const leave = [
      {
        id: 12,
        personId: 7,
        name: "Alex Staff",
        start: "2026-12-04",
        end: "2026-12-08",
        startHalf: "pm",
        endHalf: "full",
        status: "approved",
        type: "Annual",
      },
      {
        id: 13,
        personId: 8,
        name: "Jamie Staff",
        start: "2026-12-04",
        end: "2026-12-04",
        startHalf: "full",
        endHalf: "full",
        status: "pending",
        type: "Sick",
      },
    ];

    const staffView = toCalendarLeaves(leave, "staff", 7);
    assert.equal(staffView.length, 2);
    assert.equal(staffView[0].type, "Annual");
    assert.equal(staffView[1].type, null);
    assert.equal(staffView[1].status, "pending");
    assert.equal(staffView[1].start, "2026-12-04");
    assert.equal(staffView[1].end, "2026-12-04");

    const managerView = toCalendarLeaves(leave, "manager", 9);
    assert.equal(managerView[1].type, "Sick");
  });
});
