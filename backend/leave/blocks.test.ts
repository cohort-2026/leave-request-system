import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLeavePolicyWarnings,
  firstBlockWarning,
  matchingDateBlocks,
  type DateBlockRecord,
  type LeavePolicyContext,
} from "./blocks.js";

const operationsBlock: DateBlockRecord = {
  id: 1,
  departmentId: 10,
  startsOn: "2026-12-20",
  endsOn: "2026-12-31",
  mode: "block",
  reason: "Year-end freeze for Operations",
};

const companyWarn: DateBlockRecord = {
  id: 2,
  departmentId: null,
  startsOn: "2026-12-24",
  endsOn: "2026-12-26",
  mode: "warn",
  reason: "Christmas skeleton crew",
};

const durbanBlock: DateBlockRecord = {
  id: 3,
  departmentId: 20,
  startsOn: "2026-12-20",
  endsOn: "2026-12-31",
  mode: "block",
  reason: "Durban warehouse stocktake",
};

function context(
  overrides: Partial<LeavePolicyContext> = {},
): LeavePolicyContext {
  return {
    ignoresBlocks: false,
    departmentId: 10,
    departmentName: "Operations",
    maxOff: 2,
    startDate: "2026-12-21",
    endDate: "2026-12-23",
    blocks: [operationsBlock, companyWarn, durbanBlock],
    othersOffInDepartment: 0,
    ...overrides,
  };
}

describe("matchingDateBlocks", () => {
  it("applies a department block and a company-wide block to that department", () => {
    const matched = matchingDateBlocks(
      [operationsBlock, companyWarn, durbanBlock],
      "2026-12-24",
      "2026-12-24",
      10,
    );
    assert.deepEqual(
      matched.map((block) => block.id),
      [1, 2],
    );
  });

  it("does not apply a Durban block to Johannesburg", () => {
    const matched = matchingDateBlocks(
      [durbanBlock],
      "2026-12-21",
      "2026-12-23",
      10,
    );
    assert.deepEqual(matched, []);
  });
});

describe("buildLeavePolicyWarnings", () => {
  it("refuses Annual on a Block period for Operations with the reason", () => {
    const warnings = buildLeavePolicyWarnings(context());
    assert.deepEqual(warnings, [
      { kind: "block", message: "Year-end freeze for Operations" },
    ]);
    assert.equal(
      firstBlockWarning(warnings)?.message,
      "Year-end freeze for Operations",
    );
  });

  it("accepts Sick on that period with no block warning", () => {
    const warnings = buildLeavePolicyWarnings(
      context({ ignoresBlocks: true }),
    );
    assert.deepEqual(warnings, []);
  });

  it("keeps a Warn as a warning that still allows submit", () => {
    const warnings = buildLeavePolicyWarnings(
      context({
        startDate: "2026-12-24",
        endDate: "2026-12-24",
        blocks: [companyWarn],
      }),
    );
    assert.deepEqual(warnings, [
      { kind: "warn", message: "Christmas skeleton crew" },
    ]);
    assert.equal(firstBlockWarning(warnings), undefined);
  });

  it("adds a clash warning when the third person would exceed max_off", () => {
    const warnings = buildLeavePolicyWarnings(
      context({
        startDate: "2026-11-02",
        endDate: "2026-11-02",
        blocks: [],
        othersOffInDepartment: 2,
        maxOff: 2,
      }),
    );
    assert.deepEqual(warnings, [
      {
        kind: "clash",
        message:
          "This would take Operations over its maximum of 2 people off",
      },
    ]);
  });

  it("does not clash when two people are already at the max_off limit", () => {
    const warnings = buildLeavePolicyWarnings(
      context({
        startDate: "2026-11-02",
        endDate: "2026-11-02",
        blocks: [],
        othersOffInDepartment: 1,
        maxOff: 2,
      }),
    );
    assert.deepEqual(warnings, []);
  });
});
