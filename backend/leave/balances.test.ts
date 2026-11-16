import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.DATABASE_URL ??= "postgres://localhost/leave-balance-tests";
const { toPublicBalance } = await import("./balances.js");

describe("toPublicBalance", () => {
  it("subtracts taken and pending days from a paid entitlement", () => {
    const balance = toPublicBalance({
      balance_id: 1,
      leave_type_id: 2,
      leave_type: "Annual",
      default_days: 15,
      entitled_days: "10.5",
      days_used: "0",
      pending_days: "8.0",
      has_balance: true,
      cycle_months: 12,
    });

    assert.equal(balance.available, 2.5);
    assert.equal(balance.pending, 8);
    assert.equal(balance.cycleLabel, "12 months");
  });

  it("reports unlimited leave without a finite available balance", () => {
    const balance = toPublicBalance({
      balance_id: 3,
      leave_type_id: 4,
      leave_type: "Unpaid",
      default_days: 0,
      entitled_days: "0",
      days_used: "0",
      pending_days: "3.0",
      has_balance: false,
      cycle_months: null,
    });

    assert.equal(balance.hasBalance, false);
    assert.equal(balance.available, null);
    assert.equal(balance.daysRemaining, 0);
    assert.equal(balance.pending, 3);
    assert.equal(balance.cycleLabel, null);
  });
});
