import { withHouseholdRoute } from "@/lib/api-route";
import { assertCallerFullMember } from "@/lib/caller";
import prisma from "@/lib/prisma";

const EXPORT_PAGE_SIZE = 500;

type MembershipCursor = { householdId: string; userId: string };
type ShareCursor = { transactionId: string; userId: string };

type ExportValue =
  | string
  | number
  | boolean
  | null
  | Date
  | ExportValue[]
  | { [key: string]: ExportValue };

async function* paginate<TDb, TDto, TCursor>(
  findPage: (cursor: TCursor | null) => Promise<TDb[]>,
  cursorOf: (row: TDb) => TCursor,
  toDto: (row: TDb) => TDto,
): AsyncGenerator<TDto> {
  let cursor: TCursor | null = null;
  while (true) {
    const rows = await findPage(cursor);
    if (rows.length === 0) return;

    for (const row of rows) {
      yield toDto(row);
    }
    if (rows.length < EXPORT_PAGE_SIZE) return;
    cursor = cursorOf(rows[rows.length - 1]);
  }
}

function jsonValue(value: ExportValue) {
  const text = JSON.stringify(value, null, 2);
  return text === undefined ? "null" : text;
}

function indentLines(value: string, spaces: number) {
  const pad = " ".repeat(spaces);
  return value.replaceAll("\n", `\n${pad}`);
}

type WriteChunk = (chunk: string) => void;

function writeProperty(
  write: WriteChunk,
  key: string,
  value: ExportValue,
  last: boolean,
) {
  const suffix = last ? "" : ",";
  write(
    `  ${JSON.stringify(key)}: ${indentLines(jsonValue(value), 2)}${suffix}\n`,
  );
}

async function writeArrayProperty(
  write: WriteChunk,
  key: string,
  rows: AsyncIterable<ExportValue>,
  last: boolean,
) {
  const suffix = last ? "" : ",";
  write(`  ${JSON.stringify(key)}: [`);
  let count = 0;
  for await (const row of rows) {
    write(count === 0 ? "\n    " : ",\n    ");
    write(indentLines(jsonValue(row), 4));
    count += 1;
  }
  write(count === 0 ? `]${suffix}\n` : `\n  ]${suffix}\n`);
}

export async function GET() {
  return withHouseholdRoute(async (result) => {
    try {
      assertCallerFullMember(
        result.caller,
        "Only full members can export household data",
      );
    } catch {
      return Response.json(
        { message: "Only full members can export household data" },
        { status: 403 },
      );
    }

    const { session, household } = result;
    const householdId = household.id;

    const members = paginate(
      (cursor: MembershipCursor | null) =>
        prisma.householdMembership.findMany({
          where: { householdId },
          select: {
            userId: true,
            joinedAt: true,
            emailDigest: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: [{ joinedAt: "asc" }, { userId: "asc" }],
          take: EXPORT_PAGE_SIZE,
          ...(cursor && {
            cursor: { householdId_userId: cursor },
            skip: 1,
          }),
        }),
      (row) => ({ householdId, userId: row.userId }),
      (row) => ({
        userId: row.user.id,
        name: row.user.name,
        email: row.user.email,
        joinedAt: row.joinedAt,
        emailDigest: row.emailDigest,
      }),
    );

    const transactions = paginate(
      (cursor: string | null) =>
        prisma.transaction.findMany({
          where: {
            householdId,
            OR: [{ shared: true }, { addedById: session.user.id }],
          },
          orderBy: [{ date: "desc" }, { id: "desc" }],
          take: EXPORT_PAGE_SIZE,
          ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        }),
      (row) => row.id,
      (row) => ({ ...row, amount: row.amount.toNumber() }),
    );

    const categories = paginate(
      (cursor: string | null) =>
        prisma.category.findMany({
          where: { householdId },
          orderBy: [{ name: "asc" }, { id: "asc" }],
          take: EXPORT_PAGE_SIZE,
          ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        }),
      (row) => row.id,
      (row) => row,
    );

    const goals = paginate(
      (cursor: string | null) =>
        prisma.goal.findMany({
          where: { householdId },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          take: EXPORT_PAGE_SIZE,
          ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        }),
      (row) => row.id,
      (row) => ({ ...row, target: row.target.toNumber() }),
    );

    const budgets = paginate(
      (cursor: string | null) =>
        prisma.budget.findMany({
          where: { householdId },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          take: EXPORT_PAGE_SIZE,
          ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        }),
      (row) => row.id,
      (row) => ({ ...row, amount: row.amount.toNumber() }),
    );

    const notifications = paginate(
      (cursor: string | null) =>
        prisma.notification.findMany({
          where: { householdId, userId: session.user.id },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: EXPORT_PAGE_SIZE,
          ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        }),
      (row) => row.id,
      (row) => row,
    );

    const inviteLinks = paginate(
      (cursor: string | null) =>
        prisma.inviteLink.findMany({
          where: { householdId },
          select: {
            id: true,
            createdById: true,
            createdAt: true,
            revokedAt: true,
          },
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: EXPORT_PAGE_SIZE,
          ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        }),
      (row) => row.id,
      (row) => row,
    );

    const transactionShares = paginate(
      (cursor: ShareCursor | null) =>
        prisma.transactionShare.findMany({
          where: { transaction: { householdId } },
          orderBy: [{ transactionId: "asc" }, { userId: "asc" }],
          take: EXPORT_PAGE_SIZE,
          ...(cursor && {
            cursor: { transactionId_userId: cursor },
            skip: 1,
          }),
        }),
      (row) => ({ transactionId: row.transactionId, userId: row.userId }),
      (row) => ({ ...row, amount: row.amount.toNumber() }),
    );

    const encoder = new TextEncoder();
    const exportedAt = new Date().toISOString();
    const householdSnapshot = {
      id: household.id,
      currency: household.currency,
      createdAt: household.createdAt,
    };

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const write: WriteChunk = (chunk) =>
          controller.enqueue(encoder.encode(chunk));
        try {
          write("{\n");
          writeProperty(write, "exportedAt", exportedAt, false);
          writeProperty(write, "household", householdSnapshot, false);
          await writeArrayProperty(write, "members", members, false);
          await writeArrayProperty(write, "transactions", transactions, false);
          await writeArrayProperty(write, "categories", categories, false);
          await writeArrayProperty(write, "goals", goals, false);
          await writeArrayProperty(write, "budgets", budgets, false);
          await writeArrayProperty(
            write,
            "notifications",
            notifications,
            false,
          );
          await writeArrayProperty(write, "inviteLinks", inviteLinks, false);
          await writeArrayProperty(
            write,
            "transactionShares",
            transactionShares,
            true,
          );
          write("}");
          controller.close();
        } catch (cause) {
          controller.error(cause);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="sora-export.json"',
      },
    });
  });
}
