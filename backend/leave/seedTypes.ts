import type { Pool, PoolClient } from "pg";
import { pool } from "../db.js";

type Queryable = Pool | PoolClient;

// Matches backend/sql/013_leave_types.sql. ON CONFLICT DO NOTHING so signup
// and a one-off backfill are safe if those rows already exist.
export const DEFAULT_LEAVE_TYPES = [
  {
    name: "Annual",
    defaultDays: 15,
    allowBackdate: false,
    requiresDocumentAfterDays: null,
  },
  {
    name: "Sick",
    defaultDays: 10,
    allowBackdate: true,
    requiresDocumentAfterDays: 2,
  },
  {
    name: "Family responsibility",
    defaultDays: 3,
    allowBackdate: true,
    requiresDocumentAfterDays: null,
  },
  {
    name: "Unpaid",
    defaultDays: 0,
    allowBackdate: false,
    requiresDocumentAfterDays: null,
  },
  {
    name: "Study",
    defaultDays: 5,
    allowBackdate: false,
    requiresDocumentAfterDays: null,
  },
] as const;

const INSERT_COLUMNS = `company_id,
    name,
    default_days,
    allowance_period,
    is_active,
    allow_backdate,
    requires_document_after_days`;

const FROM_DEFAULTS = `UNNEST($1::text[], $2::int[], $3::boolean[], $4::int[])
     AS lt(name, default_days, allow_backdate, requires_document_after_days)`;

function defaultTypeParams(): [string[], number[], boolean[], Array<number | null>] {
  return [
    DEFAULT_LEAVE_TYPES.map((type) => type.name),
    DEFAULT_LEAVE_TYPES.map((type) => type.defaultDays),
    DEFAULT_LEAVE_TYPES.map((type) => type.allowBackdate),
    DEFAULT_LEAVE_TYPES.map((type) => type.requiresDocumentAfterDays),
  ];
}

export async function seedDefaultLeaveTypes(
  companyId: number,
  executor: Queryable = pool,
): Promise<void> {
  const [names, defaultDays, allowBackdate, requiresDocumentAfterDays] =
    defaultTypeParams();
  await executor.query(
    `INSERT INTO leave_types (
       ${INSERT_COLUMNS}
     )
     SELECT
       $5,
       lt.name,
       lt.default_days,
       'annual',
       true,
       lt.allow_backdate,
       lt.requires_document_after_days
     FROM ${FROM_DEFAULTS}
     ON CONFLICT (company_id, name) DO NOTHING`,
    [names, defaultDays, allowBackdate, requiresDocumentAfterDays, companyId],
  );
}

export async function backfillDefaultLeaveTypes(
  executor: Queryable = pool,
): Promise<void> {
  const params = defaultTypeParams();
  await executor.query(
    `INSERT INTO leave_types (
       ${INSERT_COLUMNS}
     )
     SELECT
       companies.id,
       lt.name,
       lt.default_days,
       'annual',
       true,
       lt.allow_backdate,
       lt.requires_document_after_days
     FROM companies
     CROSS JOIN ${FROM_DEFAULTS}
     ON CONFLICT (company_id, name) DO NOTHING`,
    params,
  );
}
