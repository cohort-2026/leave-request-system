export type WorkingDayFlags = {
  mondayIsWorking: boolean;
  tuesdayIsWorking: boolean;
  wednesdayIsWorking: boolean;
  thursdayIsWorking: boolean;
  fridayIsWorking: boolean;
  saturdayIsWorking: boolean;
  sundayIsWorking: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const WORKING_FIELD_BY_UTC_DAY: readonly (keyof WorkingDayFlags)[] = [
  "sundayIsWorking",
  "mondayIsWorking",
  "tuesdayIsWorking",
  "wednesdayIsWorking",
  "thursdayIsWorking",
  "fridayIsWorking",
  "saturdayIsWorking",
];

function dayNumber(date: string): number {
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
  return timestamp / DAY_MS;
}

export type DayHalf = "full" | "am" | "pm";

export type WorkingDaysPreview = {
  workingDays: number;
  excluded: string[];
};

function dayFraction(
  date: string,
  start: string,
  end: string,
  startHalf: DayHalf,
  endHalf: DayHalf,
): number {
  const sameDay = start === end;
  if (sameDay) {
    if (startHalf === "pm" && endHalf === "am") {
      throw new RangeError(
        "Afternoon start and morning end are not valid on the same day",
      );
    }
    if (startHalf === "pm" || endHalf === "am") return 0.5;
    return 1;
  }
  if (date === start && startHalf === "pm") return 0.5;
  if (date === end && endHalf === "am") return 0.5;
  return 1;
}

export function countWorkingDaysPreview(
  workingDays: WorkingDayFlags,
  holidayDates: readonly string[],
  start: string,
  end: string,
  startHalf: DayHalf = "full",
  endHalf: DayHalf = "full",
): WorkingDaysPreview {
  const firstDay = dayNumber(start);
  const lastDay = dayNumber(end);
  if (firstDay > lastDay) {
    throw new RangeError("Start date must be on or before end date");
  }

  const holidays = new Set(holidayDates);
  const excluded: string[] = [];
  let count = 0;
  for (let day = firstDay; day <= lastDay; day += 1) {
    const date = new Date(day * DAY_MS);
    const dateString = date.toISOString().slice(0, 10);
    const workingField = WORKING_FIELD_BY_UTC_DAY[date.getUTCDay()];
    const isWorkingWeekday = workingDays[workingField];
    if (!isWorkingWeekday) continue;
    if (holidays.has(dateString)) {
      excluded.push(dateString);
      continue;
    }
    count += dayFraction(dateString, start, end, startHalf, endHalf);
  }
  return { workingDays: count, excluded };
}

export function countWorkingDays(
  workingDays: WorkingDayFlags,
  holidayDates: readonly string[],
  start: string,
  end: string,
  startHalf: DayHalf = "full",
  endHalf: DayHalf = "full",
): number {
  return countWorkingDaysPreview(
    workingDays,
    holidayDates,
    start,
    end,
    startHalf,
    endHalf,
  ).workingDays;
}
