import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countWorkingDays, type WorkingDayFlags } from "./workingDays.js";
import {
  ZA_HOLIDAY_YEARS,
  zaHolidayYearsToSeed,
  zaPublicHolidays,
} from "./zaHolidays.js";

const weekdays: WorkingDayFlags = {
  mondayIsWorking: true,
  tuesdayIsWorking: true,
  wednesdayIsWorking: true,
  thursdayIsWorking: true,
  fridayIsWorking: true,
  saturdayIsWorking: false,
  sundayIsWorking: false,
};

describe("zaPublicHolidays", () => {
  it("seeds 12 South African public holidays for 2026", () => {
    const holidays = zaPublicHolidays(2026);
    assert.equal(holidays.length, 12);
    assert.equal(new Set(holidays.map((holiday) => holiday.date)).size, 12);
  });

  it("observes Women's Day 2026 on Monday 10 August", () => {
    const womensDay = zaPublicHolidays(2026).find(
      (holiday) => holiday.name === "Women's Day",
    );
    assert.deepEqual(womensDay, {
      name: "Women's Day",
      date: "2026-08-10",
      actualDate: "2026-08-09",
    });
  });

  it("leaves a weekday holiday on its actual date", () => {
    const youthDay = zaPublicHolidays(2026).find(
      (holiday) => holiday.name === "Youth Day",
    );
    assert.deepEqual(youthDay, {
      name: "Youth Day",
      date: "2026-06-16",
      actualDate: null,
    });
  });

  it("uses the Good Friday table for Family Day", () => {
    const holidays = zaPublicHolidays(2026);
    assert.equal(
      holidays.find((holiday) => holiday.name === "Good Friday")?.date,
      "2026-04-03",
    );
    assert.equal(
      holidays.find((holiday) => holiday.name === "Family Day")?.date,
      "2026-04-06",
    );
  });

  it("observes Day of Goodwill 2027 on Monday 27 December", () => {
    const goodwill = zaPublicHolidays(2027).find(
      (holiday) => holiday.name === "Day of Goodwill",
    );
    assert.deepEqual(goodwill, {
      name: "Day of Goodwill",
      date: "2027-12-27",
      actualDate: "2027-12-26",
    });
  });
});

describe("zaHolidayYearsToSeed", () => {
  it("seeds every supported year when none are stored", () => {
    assert.deepEqual(zaHolidayYearsToSeed([]), [...ZA_HOLIDAY_YEARS]);
  });

  it("skips years that already have SA holidays", () => {
    assert.deepEqual(zaHolidayYearsToSeed([2026, 2028]), [2027, 2029, 2030]);
  });
});

describe("Women's Day working-day count", () => {
  it("counts 10–14 Aug 2026 as 4 working days", () => {
    const holidays = zaPublicHolidays(2026).map((holiday) => holiday.date);
    assert.equal(
      countWorkingDays(weekdays, holidays, "2026-08-10", "2026-08-14"),
      4,
    );
  });
});
