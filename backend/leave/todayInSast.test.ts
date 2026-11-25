import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { leaveHasStartedInSast, todayInSast } from "./todayInSast.js";

describe("leaveHasStartedInSast", () => {
  const justAfterSastMidnight = new Date("2026-11-23T22:30:00.000Z");

  it("uses the SAST calendar date at the start-date boundary", () => {
    assert.equal(todayInSast(justAfterSastMidnight), "2026-11-24");
    assert.equal(
      leaveHasStartedInSast("2026-11-24", justAfterSastMidnight),
      true,
    );
    assert.equal(
      leaveHasStartedInSast("2026-11-25", justAfterSastMidnight),
      false,
    );
  });
});
