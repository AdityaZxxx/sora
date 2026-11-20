import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { cacheLife, cacheTag } from "next/cache";

import { CACHE_RESOURCE, householdTag } from "@/lib/cache";
import { requireCategory } from "@/lib/categories";
import { categoryIconSnapshot } from "@/lib/category-icons";
import { addDays, clampToMonth, utcStartOfDay } from "@/lib/dates";
import { DomainError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { publishHouseholdChange } from "@/lib/realtime";
import { assertFullMemberRole, type MemberRole } from "@/lib/roles";
import { DeleteIdSchema } from "@/schemas/delete";
import {
  CreateRecurringItemSchema,
  SetRecurringItemPausedSchema,
  UpdateRecurringItemSchema,
  type CreateRecurringItemType,
  type UpdateRecurringItemType,
} from "@/schemas/recurring";

export type RecurringItemRow = {
  id: string;
  name: string;
  amount: number;
  category: string;
  categoryIcon: string;
  categoryIconKind: string;
  categoryIconColor: string | null;
  type: string;
  frequency: string;
  weekday: number | null;
  dayOfMonth: number | null;
  startDate: Date | null;
  endDate: Date | null;
  paused: boolean;
  lastPostedAt: Date | null;
  createdAt: Date;
  dueDate: Date | null;
  isDue: boolean;
  isOverdue: boolean;
};

function firstWeeklyOnOrAfter(first: Date, weekday: number) {
  const delta = (weekday - first.getUTCDay() + 7) % 7;
  return addDays(first, delta);
}

function firstMonthlyOnOrAfter(first: Date, dayOfMonth: number) {
  const year = first.getUTCFullYear();
  const month = first.getUTCMonth();
  const clamped = clampToMonth(year, month, dayOfMonth);
  if (first.getUTCDate() <= clamped) {
    return new Date(Date.UTC(year, month, clamped));
  }
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  return new Date(
    Date.UTC(
      nextYear,
      nextMonth,
      clampToMonth(nextYear, nextMonth, dayOfMonth),
    ),
  );
}

export function occurrenceOnOrBefore(
  item: {
    frequency: string;
    weekday: number | null;
    dayOfMonth: number | null;
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date;
  },
  day: Date,
): Date | null {
  const today = utcStartOfDay(day);
  if (item.endDate && today.getTime() > utcStartOfDay(item.endDate).getTime()) {
    return null;
  }
  const first = item.startDate ? utcStartOfDay(item.startDate) : null;

  if (item.frequency === "weekly") {
    if (item.weekday === null) return null;
    const daysBack = (today.getUTCDay() - item.weekday + 7) % 7;
    const occurrence = addDays(today, -daysBack);
    if (!first) return occurrence;
    const firstOccurrence = firstWeeklyOnOrAfter(first, item.weekday);
    return occurrence.getTime() >= firstOccurrence.getTime()
      ? occurrence
      : null;
  }

  if (item.dayOfMonth === null) return null;
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const thisMonthDay = clampToMonth(year, month, item.dayOfMonth);
  let occurrence: Date;
  if (today.getUTCDate() >= thisMonthDay) {
    occurrence = new Date(Date.UTC(year, month, thisMonthDay));
  } else {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    occurrence = new Date(
      Date.UTC(
        prevYear,
        prevMonth,
        clampToMonth(prevYear, prevMonth, item.dayOfMonth),
      ),
    );
  }
  if (!first) return occurrence;
  const firstOccurrence = firstMonthlyOnOrAfter(first, item.dayOfMonth);
  return occurrence.getTime() >= firstOccurrence.getTime() ? occurrence : null;
}

export function isRecurringItemDue(
  item: {
    paused: boolean;
    frequency: string;
    weekday: number | null;
    dayOfMonth: number | null;
    startDate: Date | null;
    endDate: Date | null;
    lastPostedAt: Date | null;
    createdAt: Date;
  },
  now: Date = new Date(),
): boolean {
  if (item.paused) return false;
  const occurrence = occurrenceOnOrBefore(item, now);
  if (!occurrence) return false;
  return (
    !item.lastPostedAt ||
    utcStartOfDay(item.lastPostedAt).getTime() < occurrence.getTime()
  );
}

function toRow(item: {
  id: string;
  name: string;
  amount: { toNumber(): number };
  category: string;
  categoryIcon: string;
  categoryIconKind: string;
  categoryIconColor: string | null;
  type: string;
  frequency: string;
  weekday: number | null;
  dayOfMonth: number | null;
  startDate: Date | null;
  endDate: Date | null;
  paused: boolean;
  lastPostedAt: Date | null;
  createdAt: Date;
}): RecurringItemRow {
  const dueDate = occurrenceOnOrBefore(item, new Date());
  const today = utcStartOfDay(new Date());
  return {
    ...item,
    amount: item.amount.toNumber(),
    dueDate,
    isDue: isRecurringItemDue(item),
    isOverdue: dueDate !== null && dueDate.getTime() < today.getTime(),
  };
}

export async function listRecurringItems(householdId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(householdTag(householdId, CACHE_RESOURCE.recurring));

  const items = await prisma.recurringItem.findMany({
    where: { householdId },
    select: {
      id: true,
      name: true,
      amount: true,
      category: true,
      categoryIcon: true,
      categoryIconKind: true,
      categoryIconColor: true,
      type: true,
      frequency: true,
      weekday: true,
      dayOfMonth: true,
      startDate: true,
      endDate: true,
      paused: true,
      lastPostedAt: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "asc" }],
  });
  return items.map(toRow);
}

type ParsedRecurringItem = z.output<typeof CreateRecurringItemSchema>;

function scheduleFields(input: ParsedRecurringItem) {
  return input.frequency === "weekly"
    ? { weekday: input.weekday ?? null, dayOfMonth: null }
    : { weekday: null, dayOfMonth: input.dayOfMonth ?? null };
}

export async function createRecurringItem(
  householdId: string,
  input: CreateRecurringItemType,
  role: MemberRole,
) {
  assertFullMemberRole(role);
  const parsed = CreateRecurringItemSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Invalid bill");
  }

  const category = await requireCategory(
    householdId,
    parsed.data.category,
    parsed.data.type,
  );
  const item = await prisma.recurringItem.create({
    data: {
      householdId,
      name: parsed.data.name,
      amount: parsed.data.amount,
      category: category.name,
      ...categoryIconSnapshot(category),
      type: parsed.data.type,
      frequency: parsed.data.frequency,
      ...scheduleFields(parsed.data),
      startDate: parsed.data.startDate ?? null,
      endDate: parsed.data.endDate ?? null,
    },
  });

  await publishHouseholdChange({
    householdId,
    resource: "recurring",
    message: `added the ${item.name} bill`,
  });

  return item;
}

export async function updateRecurringItem(
  householdId: string,
  input: UpdateRecurringItemType,
  role: MemberRole,
) {
  assertFullMemberRole(role);
  const parsed = UpdateRecurringItemSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Invalid bill");
  }

  const existing = await prisma.recurringItem.findFirst({
    where: {
      id: parsed.data.id,
      householdId,
    },
  });
  if (!existing) {
    throw new DomainError("Bill not found");
  }
  const category = await requireCategory(
    householdId,
    parsed.data.category,
    parsed.data.type,
  );
  const data: Prisma.RecurringItemUpdateInput = {
    name: parsed.data.name,
    amount: parsed.data.amount,
    category: category.name,
    ...categoryIconSnapshot(category),
    type: parsed.data.type,
    frequency: parsed.data.frequency,
    ...scheduleFields(parsed.data),
    startDate: parsed.data.startDate ?? null,
    endDate: parsed.data.endDate ?? null,
  };
  if (parsed.data.paused !== undefined) {
    data.paused = parsed.data.paused;
  }
  const item = await prisma.recurringItem.update({
    where: {
      id: existing.id,
    },
    data,
  });

  await publishHouseholdChange({
    householdId,
    resource: "recurring",
    message: `changed the ${item.name} bill`,
  });

  return item;
}

export async function setRecurringItemPaused(
  householdId: string,
  id: string,
  paused: boolean,
  role: MemberRole,
) {
  assertFullMemberRole(role);

  const parsedBody = SetRecurringItemPausedSchema.safeParse({ id, paused });
  if (!parsedBody.success) {
    throw new DomainError(
      parsedBody.error.issues[0]?.message ?? "Bill not found",
    );
  }
  const result = await prisma.recurringItem.updateMany({
    where: {
      id,
      householdId,
    },
    data: {
      paused,
    },
  });
  if (result.count === 0) {
    throw new DomainError("Bill not found");
  }

  await publishHouseholdChange({
    householdId,
    resource: "recurring",
    message: "changed a bill",
  });
}

export async function deleteRecurringItem(
  householdId: string,
  id: string,
  role: MemberRole,
) {
  assertFullMemberRole(role);

  const parsedId = DeleteIdSchema.safeParse({ id });
  if (!parsedId.success) {
    throw new DomainError(
      parsedId.error.issues[0]?.message ?? "Bill not found",
    );
  }
  const result = await prisma.recurringItem.deleteMany({
    where: {
      id,
      householdId,
    },
  });
  if (result.count === 0) {
    throw new DomainError("Bill not found");
  }

  await publishHouseholdChange({
    householdId,
    resource: "recurring",
    message: "removed a bill",
  });
}
