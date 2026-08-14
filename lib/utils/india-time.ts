import { INDIA_LOCALE, INDIA_TIME_ZONE } from "@/config/constants";

type DateLike = Date | string | number;

function asDate(value: DateLike) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date.");
  return date;
}

function parts(value: DateLike) {
  return Object.fromEntries(new Intl.DateTimeFormat(INDIA_LOCALE, {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(asDate(value)).filter((part) => part.type !== "literal").map((part) => [part.type, part.value])) as Record<string, string>;
}

export function indiaDateKey(value: DateLike) {
  const date = parts(value);
  return `${date.year}-${date.month}-${date.day}`;
}

export function indiaTodayKey(now = new Date()) {
  return indiaDateKey(now);
}

export function indiaDateTimeLocalValue(value: DateLike) {
  const date = parts(value);
  return `${date.year}-${date.month}-${date.day}T${date.hour}:${date.minute}`;
}

export function formatIndiaDate(value: DateLike) {
  return new Intl.DateTimeFormat(INDIA_LOCALE, {
    timeZone: INDIA_TIME_ZONE,
    dateStyle: "medium",
  }).format(asDate(value));
}

export function formatIndiaDateTime(value: DateLike) {
  return new Intl.DateTimeFormat(INDIA_LOCALE, {
    timeZone: INDIA_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(asDate(value));
}

export function formatIndiaMonth(value: DateLike) {
  return new Intl.DateTimeFormat(INDIA_LOCALE, {
    timeZone: INDIA_TIME_ZONE,
    month: "short",
  }).format(asDate(value));
}

/** Convert an HTML date input into the instant representing midnight in India. */
export function parseIndiaDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid Indian date input.");
  const date = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime()) || indiaDateKey(date) !== value) throw new Error("Invalid Indian date input.");
  return date;
}

/** Convert an HTML datetime-local input into an instant in the Indian timezone. */
export function parseIndiaDateTimeInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) throw new Error("Invalid Indian date-time input.");
  const [, year, month, day, hour, minute, second = "00"] = match;
  const normalized = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  const date = new Date(`${normalized}+05:30`);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid Indian date-time input.");
  const local = parts(date);
  const roundTrip = `${local.year}-${local.month}-${local.day}T${local.hour}:${local.minute}:${local.second}`;
  if (roundTrip !== normalized) throw new Error("Invalid Indian date-time input.");
  return date;
}

/** Normalize a date-only form/API value without changing already-serialized instants. */
export function parseIndiaDateValue(value: unknown) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    try { return parseIndiaDateInput(value); } catch { return value; }
  }
  return value;
}

/** Normalize a datetime-local form/API value without changing ISO instants. */
export function parseIndiaDateTimeValue(value: unknown) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) {
    try { return parseIndiaDateTimeInput(value); } catch { return value; }
  }
  return value;
}

export function normalizeIndiaCalendarDate(value: DateLike) {
  return parseIndiaDateInput(indiaDateKey(value));
}

export function indiaDayRange(value: DateLike) {
  const start = normalizeIndiaCalendarDate(value);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
