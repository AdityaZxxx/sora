import { differenceInDays } from "date-fns";

import { MAX_DATE_RANGE } from "@/lib/constants";
import { DomainError } from "@/lib/errors";

export const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type DateRange = { from: Date; to: Date };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseDate(value: string) {
  const match = DATE_PATTERN.exec(value);

  if (!match) {
    throw new DomainError(`Invalid date: ${value}. Use the YYYY-MM-DD format.`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  // Date.UTC rolls 2026-02-30 into March 2 instead of failing, so reading
  // the parts back is what catches an impossible date.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new DomainError(`Invalid date: ${value}. Use the YYYY-MM-DD format.`);
  }

  return date;
}

export function utcStartOfDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function clampToMonth(year: number, month: number, day: number) {
  return Math.min(day, daysInMonth(year, month));
}

export function utcMonthRangeFor(date: Date): DateRange {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return {
    from: new Date(Date.UTC(year, month, 1)),
    to: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)),
  };
}

export function previousMonthRange(date: Date): DateRange {
  return utcMonthRangeFor(
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)),
  );
}

export function todayAtUtcMidnight() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
  );
}

export function formatDateValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function monthOffsets(count: number): { year: number; month: number }[] {
  const now = new Date();
  const months: { year: number; month: number }[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1),
    );
    months.push({
      year: date.getUTCFullYear(),
      month: date.getUTCMonth(),
    });
  }
  return months;
}

export function startOfDay(value: string) {
  return parseDate(value);
}

export function endOfDay(value: string) {
  const date = parseDate(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

export function resolveDateRange(from?: string, to?: string): DateRange {
  const now = new Date();

  const start = from
    ? startOfDay(from)
    : new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
      );
  const end = to
    ? endOfDay(to)
    : new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      );

  if (start > end) {
    throw new DomainError("The start date is after the end date.");
  }

  if (differenceInDays(end, start) > MAX_DATE_RANGE) {
    throw new DomainError(
      `The date range is longer than ${MAX_DATE_RANGE} days. Narrow it.`,
    );
  }

  return { from: start, to: end };
}
