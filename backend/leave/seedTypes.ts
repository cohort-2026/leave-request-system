import type { Pool, PoolClient } from "pg";
import { pool } from "../db.js";

type Queryable = Pool | PoolClient;

// Matches the starter types in backend/sql/013_leave_types.sql and their S1
// balance settings in backend/sql/027_s1_balances.sql.
export const DEFAULT_LEAVE_TYPES = [
  {
    name: "Annual",
    defaultDays: 15,
    hasBalance: true,
    cycleMonths: 12,
    allowBackdate: false,
    requiresDocumentAfterDays: null,
  },
  {
    name: "Sick",
    defaultDays: 10,
    hasBalance: true,
    cycleMonths: 36,
    allowBackdate: true,
    requiresDocumentAfterDays: 2,
  },
  {
    name: "Family responsibility",
    defaultDays: 3,
    hasBalance: true,
    cycleMonths: 12,
    allowBackdate: true,
    requiresDocumentAfterDays: null,
  },
  {
    name: "Unpaid",
    defaultDays: 0,
    hasBalance: false,
    cycleMonths: null,
    allowBackdate: false,
    requiresDocumentAfterDays: null,
  },
  {
    name: "Study",
    defaultDays: 5,
    hasBalance: true,
    cycleMonths: 12,
    allowBackdate: false,
    requiresDocumentAfterDays: null,
  },
] as const;

const INSERT_COLUMNS = `company_id,
    name,
    default_days,
    has_balance,
    cycle_months,
    allowance_period,
    is_active,
    allow_backdate,
    requires_document_after_days`;

const FROM_DEFAULTS = `UNNEST($1::text[], $2::int[], $3::boolean[], $4::int[],
                   $5::boolean[], $6::int[])
     AS lt(name, default_days, allow_backdate, requires_document_after_days,
           has_balance, cycle_months)`;

function defaultTypeParams(): [
  string[],
  number[],
  boolean[],
  Array<number | null>,
  boolean[],
  Array<number | null>,
] {
  return [
    DEFAULT_LEAVE_TYPES.map((type) => type.name),
    DEFAULT_LEAVE_TYPES.map((type) => type.defaultDays),
    DEFAULT_LEAVE_TYPES.map((type) => type.allowBackdate),
    DEFAULT_LEAVE_TYPES.map((type) => type.requiresDocumentAfterDays),
    DEFAULT_LEAVE_TYPES.map((type) => type.hasBalance),
    DEFAULT_LEAVE_TYPES.map((type) => type.cycleMonths),
  ];
}

export async function seedDefaultLeaveTypes(
  companyId: number,
  executor: Queryable = pool,
): Promise<void> {
  const [
    names,
    defaultDays,
    allowBackdate,
    requiresDocumentAfterDays,
    hasBalance,
    cycleMonths,
  ] = defaultTypeParams();
  await executor.query(
    `INSERT INTO leave_types (
       ${INSERT_COLUMNS}
     )
     SELECT
       $7,
       lt.name,
       lt.default_days,
       lt.has_balance,
       lt.cycle_months,
       'annual',
       true,
       lt.allow_backdate,
       lt.requires_document_after_days
     FROM ${FROM_DEFAULTS}
     ON CONFLICT (company_id, name) DO NOTHING`,
    [
      names,
      defaultDays,
      allowBackdate,
      requiresDocumentAfterDays,
      hasBalance,
      cycleMonths,
      companyId,
    ],
  );
}

export async function backfillDefaultLeaveTypes(
  executor: Queryable = pool,
): Promise<void> {
  const [
    names,
    defaultDays,
    allowBackdate,
    requiresDocumentAfterDays,
    hasBalance,
    cycleMonths,
  ] = defaultTypeParams();
  await executor.query(
    `INSERT INTO leave_types (
       ${INSERT_COLUMNS}
     )
     SELECT
       companies.id,
       lt.name,
       lt.default_days,
       lt.has_balance,
       lt.cycle_months,
       'annual',
       true,
       lt.allow_backdate,
       lt.requires_document_after_days
     FROM companies
     CROSS JOIN ${FROM_DEFAULTS}
     ON CONFLICT (company_id, name) DO NOTHING`,
    [
      names,
      defaultDays,
      allowBackdate,
      requiresDocumentAfterDays,
      hasBalance,
      cycleMonths,
    ],
  );
}
