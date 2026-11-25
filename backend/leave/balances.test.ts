import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PoolClient } from "pg";

process.env.DATABASE_URL ??= "postgres://localhost/leave-balance-tests";
const { restoreApprovedLeaveBalance, toPublicBalance } = await import(
  "./balances.js"
);

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

describe("restoreApprovedLeaveBalance", () => {
  it("restores approved days to a balance in the same transaction", async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];
    const executor = {
      query: async (sql: string, params?: unknown[]) => {
        calls.push({ sql, params });
        return calls.length === 1
          ? { rows: [{ has_balance: true }], rowCount: 1 }
          : { rows: [], rowCount: 1 };
      },
    } as unknown as PoolClient;

    const restored = await restoreApprovedLeaveBalance(
      7,
      3,
      2,
      2.5,
      executor,
    );

    assert.equal(restored, "restored");
    assert.match(calls[1].sql, /days_used = days_used - \$4/);
    assert.match(calls[1].sql, /days_remaining = days_remaining \+ \$4/);
    assert.deepEqual(calls[1].params, [3, 7, 2, 2.5]);
  });

  it("does not update balances for unlimited leave", async () => {
    let queryCount = 0;
    const executor = {
      query: async () => {
        queryCount += 1;
        return { rows: [{ has_balance: false }], rowCount: 1 };
      },
    } as unknown as PoolClient;

    assert.equal(
      await restoreApprovedLeaveBalance(7, 3, 2, 2.5, executor),
      "unlimited",
    );
    assert.equal(queryCount, 1);
  });

  it("fails when a paid balance cannot be restored", async () => {
    const executor = {
      query: async () => ({ rows: [{ has_balance: true }], rowCount: 0 }),
    } as unknown as PoolClient;

    assert.equal(
      await restoreApprovedLeaveBalance(7, 3, 2, 2.5, executor),
      false,
    );
  });
});
