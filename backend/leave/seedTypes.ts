import type { Pool, PoolClient } from "pg";
import { pool } from "../db.js";

type Queryable = Pool | PoolClient;

// Matches the starter types in backend/sql/013_leave_types.sql, S1 balance
// settings in backend/sql/027_s1_balances.sql, and S11 ignores_blocks in
// backend/sql/030_blocks.sql.
export const DEFAULT_LEAVE_TYPES = [
  {
    name: "Annual",
    defaultDays: 15,
    hasBalance: true,
    cycleMonths: 12,
    colour: "violet",
    allowBackdate: false,
    requiresDocumentAfterDays: null,
    ignoresBlocks: false,
  },
  {
    name: "Sick",
    defaultDays: 10,
    hasBalance: true,
    cycleMonths: 36,
    colour: "rose",
    allowBackdate: true,
    requiresDocumentAfterDays: 2,
    ignoresBlocks: true,
  },
  {
    name: "Family responsibility",
    defaultDays: 3,
    hasBalance: true,
    cycleMonths: 12,
    colour: "amber",
    allowBackdate: true,
    requiresDocumentAfterDays: null,
    ignoresBlocks: true,
  },
  {
    name: "Unpaid",
    defaultDays: 0,
    hasBalance: false,
    cycleMonths: null,
    colour: "slate",
    allowBackdate: false,
    requiresDocumentAfterDays: null,
    ignoresBlocks: false,
  },
  {
    name: "Study",
    defaultDays: 5,
    hasBalance: true,
    cycleMonths: 12,
    colour: "sky",
    allowBackdate: false,
    requiresDocumentAfterDays: null,
    ignoresBlocks: false,
  },
] as const;

const INSERT_COLUMNS = `company_id,
    name,
    default_days,
    has_balance,
    cycle_months,
    colour,
    allowance_period,
    is_active,
    allow_backdate,
    requires_document_after_days,
    ignores_blocks`;

const FROM_DEFAULTS = `UNNEST($1::text[], $2::int[], $3::boolean[], $4::int[],
                   $5::boolean[], $6::int[], $7::text[], $8::boolean[])
     AS lt(name, default_days, allow_backdate, requires_document_after_days,
           has_balance, cycle_months, colour, ignores_blocks)`;

function defaultTypeParams(): [
  string[],
  number[],
  boolean[],
  Array<number | null>,
  boolean[],
  Array<number | null>,
  string[],
  boolean[],
] {
  return [
    DEFAULT_LEAVE_TYPES.map((type) => type.name),
    DEFAULT_LEAVE_TYPES.map((type) => type.defaultDays),
    DEFAULT_LEAVE_TYPES.map((type) => type.allowBackdate),
    DEFAULT_LEAVE_TYPES.map((type) => type.requiresDocumentAfterDays),
    DEFAULT_LEAVE_TYPES.map((type) => type.hasBalance),
    DEFAULT_LEAVE_TYPES.map((type) => type.cycleMonths),
    DEFAULT_LEAVE_TYPES.map((type) => type.colour),
    DEFAULT_LEAVE_TYPES.map((type) => type.ignoresBlocks),
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
    colours,
    ignoresBlocks,
  ] = defaultTypeParams();
  await executor.query(
    `INSERT INTO leave_types (
       ${INSERT_COLUMNS}
     )
     SELECT
       $9,
       lt.name,
       lt.default_days,
       lt.has_balance,
       lt.cycle_months,
       lt.colour,
       'annual',
       true,
       lt.allow_backdate,
       lt.requires_document_after_days,
       lt.ignores_blocks
     FROM ${FROM_DEFAULTS}
     ON CONFLICT (company_id, name) DO NOTHING`,
    [
      names,
      defaultDays,
      allowBackdate,
      requiresDocumentAfterDays,
      hasBalance,
      cycleMonths,
      colours,
      ignoresBlocks,
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
    colours,
    ignoresBlocks,
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
       lt.colour,
       'annual',
       true,
       lt.allow_backdate,
       lt.requires_document_after_days,
       lt.ignores_blocks
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
      colours,
      ignoresBlocks,
    ],
  );
}
