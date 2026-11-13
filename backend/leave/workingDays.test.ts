import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { todayInSast } from "./todayInSast.js";
import {
  countWorkingDays,
  countWorkingDaysPreview,
  type WorkingDayFlags,
} from "./workingDays.js";

const weekdays: WorkingDayFlags = {
  mondayIsWorking: true,
  tuesdayIsWorking: true,
  wednesdayIsWorking: true,
  thursdayIsWorking: true,
  fridayIsWorking: true,
  saturdayIsWorking: false,
  sundayIsWorking: false,
};

describe("countWorkingDays", () => {
  it("counts Fri morning as 0.5", () => {
    assert.equal(
      countWorkingDays(weekdays, [], "2026-12-04", "2026-12-04", "am", "am"),
      0.5,
    );
  });

  it("counts Mon afternoon to Tue morning as 1.0", () => {
    assert.equal(
      countWorkingDays(weekdays, [], "2026-12-07", "2026-12-08", "pm", "am"),
      1,
    );
  });

  it("counts 21 Dec–1 Jan as 8 days and lists 25 Dec and 1 Jan", () => {
    const preview = countWorkingDaysPreview(
      weekdays,
      ["2026-12-25", "2027-01-01"],
      "2026-12-21",
      "2027-01-01",
    );
    assert.equal(preview.workingDays, 8);
    assert.deepEqual(preview.excluded, ["2026-12-25", "2027-01-01"]);
  });

  it("counts 14–18 Dec as 4 days when 16 Dec is a holiday", () => {
    const preview = countWorkingDaysPreview(
      weekdays,
      ["2015-12-16"],
      "2015-12-14",
      "2015-12-18",
    );
    assert.equal(preview.workingDays, 4);
    assert.deepEqual(preview.excluded, ["2015-12-16"]);
  });
});

describe("todayInSast", () => {
  it("uses Johannesburg between 00:00 and 02:00 SAST", () => {
    const utcLate = new Date("2026-12-15T22:30:00.000Z");
    assert.equal(todayInSast(utcLate), "2026-12-16");
  });
});
