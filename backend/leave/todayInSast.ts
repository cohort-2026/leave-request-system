const SAST = "Africa/Johannesburg";

const sastDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SAST,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function todayInSast(now: Date = new Date()): string {
  return sastDateFormatter.format(now);
}
