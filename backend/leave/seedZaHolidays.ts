import type { Pool, PoolClient } from "pg";
import { pool } from "../db.js";
import {
  allZaPublicHolidays,
  zaHolidayYearsToSeed,
  zaPublicHolidays,
  type ZaHoliday,
  type ZaHolidayYear,
} from "./zaHolidays.js";

type Queryable = Pool | PoolClient;

function holidayParams(holidays: ZaHoliday[]): [string[], string[], Array<string | null>] {
  return [
    holidays.map((holiday) => holiday.date),
    holidays.map((holiday) => holiday.name),
    holidays.map((holiday) => holiday.actualDate),
  ];
}

export async function insertZaHolidays(
  companyId: number,
  year: ZaHolidayYear,
  executor: Queryable = pool,
): Promise<number> {
  const holidays = zaPublicHolidays(year);
  const [dates, names, actualDates] = holidayParams(holidays);
  const result = await executor.query(
    `INSERT INTO public_holidays (
       company_id, holiday_date, name, source, actual_date
     )
     SELECT
       $1,
       seeded.holiday_date,
       seeded.name,
       'za',
       seeded.actual_date
     FROM UNNEST($2::date[], $3::text[], $4::date[])
       AS seeded(holiday_date, name, actual_date)
     ON CONFLICT (company_id, holiday_date) DO NOTHING
     RETURNING id`,
    [companyId, dates, names, actualDates],
  );
  return result.rowCount ?? 0;
}

export async function ensureZaHolidaysForCompany(
  companyId: number,
  executor: Queryable = pool,
): Promise<void> {
  const existing = await executor.query<{ year: number }>(
    `SELECT DISTINCT EXTRACT(YEAR FROM holiday_date)::int AS year
     FROM public_holidays
     WHERE company_id = $1
       AND COALESCE(source, 'custom') = 'za'`,
    [companyId],
  );
  const missingYears = zaHolidayYearsToSeed(existing.rows.map((row) => row.year));
  for (const year of missingYears) {
    await insertZaHolidays(companyId, year, executor);
  }
}

export async function backfillZaHolidays(
  executor: Queryable = pool,
): Promise<void> {
  const holidays = allZaPublicHolidays();
  const [dates, names, actualDates] = holidayParams(holidays);
  await executor.query(
    `INSERT INTO public_holidays (
       company_id, holiday_date, name, source, actual_date
     )
     SELECT
       companies.id,
       seeded.holiday_date,
       seeded.name,
       'za',
       seeded.actual_date
     FROM companies
     CROSS JOIN UNNEST($1::date[], $2::text[], $3::date[])
       AS seeded(holiday_date, name, actual_date)
     ON CONFLICT (company_id, holiday_date) DO NOTHING`,
    [dates, names, actualDates],
  );
}
