export type ZaHoliday = {
  name: string;
  date: string;
  actualDate: string | null;
};

export const ZA_HOLIDAY_YEARS = [2026, 2027, 2028, 2029, 2030] as const;

export type ZaHolidayYear = (typeof ZA_HOLIDAY_YEARS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

const GOOD_FRIDAY_BY_YEAR: Record<ZaHolidayYear, string> = {
  2026: "2026-04-03",
  2027: "2027-03-26",
  2028: "2028-04-14",
  2029: "2029-03-30",
  2030: "2030-04-19",
};

const FIXED_HOLIDAYS: ReadonlyArray<{ month: number; day: number; name: string }> =
  [
    { month: 1, day: 1, name: "New Year's Day" },
    { month: 3, day: 21, name: "Human Rights Day" },
    { month: 4, day: 27, name: "Freedom Day" },
    { month: 5, day: 1, name: "Workers' Day" },
    { month: 6, day: 16, name: "Youth Day" },
    { month: 8, day: 9, name: "Women's Day" },
    { month: 9, day: 24, name: "Heritage Day" },
    { month: 12, day: 16, name: "Day of Reconciliation" },
    { month: 12, day: 25, name: "Christmas Day" },
    { month: 12, day: 26, name: "Day of Goodwill" },
  ];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseDate(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new RangeError(`Invalid calendar date: ${date}`);
  }
  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== date
  ) {
    throw new RangeError(`Invalid calendar date: ${date}`);
  }
  return new Date(timestamp);
}

function addDays(date: string, days: number): string {
  return new Date(parseDate(date).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function observeSunday(actualDate: string): {
  date: string;
  actualDate: string | null;
} {
  const day = parseDate(actualDate).getUTCDay();
  if (day !== 0) {
    return { date: actualDate, actualDate: null };
  }
  return { date: addDays(actualDate, 1), actualDate };
}

export function isZaHolidayYear(value: number): value is ZaHolidayYear {
  return (ZA_HOLIDAY_YEARS as readonly number[]).includes(value);
}

export function zaHolidayYearsToSeed(
  existingZaYears: Iterable<number>,
): ZaHolidayYear[] {
  const have = new Set(existingZaYears);
  return ZA_HOLIDAY_YEARS.filter((year) => !have.has(year));
}

export function allZaPublicHolidays(): ZaHoliday[] {
  return ZA_HOLIDAY_YEARS.flatMap((year) => zaPublicHolidays(year));
}

export function zaPublicHolidays(year: ZaHolidayYear): ZaHoliday[] {
  const goodFriday = GOOD_FRIDAY_BY_YEAR[year];
  const familyDay = addDays(goodFriday, 3);
  const candidates: ZaHoliday[] = [
    ...FIXED_HOLIDAYS.map((holiday) => {
      const observed = observeSunday(
        toDateString(year, holiday.month, holiday.day),
      );
      return { name: holiday.name, ...observed };
    }),
    { name: "Good Friday", ...observeSunday(goodFriday) },
    { name: "Family Day", ...observeSunday(familyDay) },
  ];

  candidates.sort((left, right) => {
    const byDate = left.date.localeCompare(right.date);
    if (byDate !== 0) return byDate;
    return left.name.localeCompare(right.name);
  });

  const used = new Set<string>();
  return candidates.map((holiday) => {
    let date = holiday.date;
    while (used.has(date)) {
      date = addDays(date, 1);
    }
    used.add(date);
    return {
      name: holiday.name,
      date,
      actualDate:
        date === holiday.date
          ? holiday.actualDate
          : (holiday.actualDate ?? holiday.date),
    };
  });
}
