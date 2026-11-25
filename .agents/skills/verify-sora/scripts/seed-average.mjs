#!/usr/bin/env node
// Seeds the disposable Sora instance with a realistic two-person wallet:
// ~6 months of transaction history, so the UI reads like a real couple's
// money instead of a verification stub. Every date is relative to "now", so
// the fixture ages with the run and never needs re-dating.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const stateDir = process.env.SORA_VERIFY_STATE_DIR;
const dbUrl = process.env.SORA_VERIFY_DB_URL;
const baseUrl = process.env.SORA_VERIFY_BASE_URL;

if (!stateDir || !dbUrl || !baseUrl) {
  console.error(
    "seed-average.mjs: SORA_VERIFY_STATE_DIR, SORA_VERIFY_DB_URL and SORA_VERIFY_BASE_URL are required",
  );
  process.exit(1);
}

const runId = process.env.SORA_VERIFY_RUN_ID ?? "unknown";
const primaryEmail = process.env.SORA_VERIFY_EMAIL ?? "avery@sora.test";
const primaryPassword = process.env.SORA_VERIFY_PASSWORD ?? "sora-verify-pass";
const memberEmail = process.env.SORA_VERIFY_MEMBER_EMAIL ?? "blake@sora.test";
const memberPassword =
  process.env.SORA_VERIFY_MEMBER_PASSWORD ?? "sora-verify-pass";

const adapter = new PrismaPg({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

const hashToken = (token) => createHash("sha256").update(token).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");
// All aggregates come back from Prisma as dollars already; format as-is.
const fmt = (d) => Number(d).toFixed(2);
const centsToDecimal = (c) => (Number(c) / 100).toFixed(2);

const now = new Date();
const MONTHS_BACK = 5; // plus the current month

// Per-month rows (today's month may be partial). Amounts and days are
// fixed, so the fixture is deterministic per day of the month and never
// generates a row dated after "now". Couples swap who pays the big bills:
// even offsets on Avery's card, odd on Blake's.
const MONTHLY_ROWS = (offset) => [
  {
    amount: 500000,
    description: "Monthly salary (Avery)",
    date: dayUTC(1, offset, 9),
    type: "income",
    category: "Salary",
    categoryIcon: "💰",
    addedById: null,
    member: "avery",
  },
  {
    amount: 340000,
    description: "Monthly salary (Blake)",
    date: dayUTC(1, offset, 9),
    type: "income",
    category: "Salary",
    categoryIcon: "💰",
    addedById: null,
    member: "blake",
  },
  {
    amount: 145000,
    description: "Rent",
    date: dayUTC(2, offset, 8),
    type: "expense",
    category: "Rent",
    categoryIcon: "🏠",
    addedById: offset % 2 === 0 ? "avery" : "blake",
    shares: "rent",
  },
  {
    amount: 7000,
    description: "Internet",
    date: dayUTC(7, offset, 19),
    type: "expense",
    category: "Utilities",
    categoryIcon: "💡",
    addedById: offset % 2 === 0 ? "avery" : "blake",
  },
  {
    amount: 12840,
    description: "Power",
    date: dayUTC(12, offset, 19),
    type: "expense",
    category: "Utilities",
    categoryIcon: "💡",
    addedById: offset % 2 === 0 ? "avery" : "blake",
  },
  {
    amount: 12450,
    description: "Groceries",
    date: dayUTC(4, offset, 18),
    type: "expense",
    category: "Groceries",
    categoryIcon: "🛒",
    addedById: "avery",
  },
  {
    amount: 11875,
    description: "Groceries",
    date: dayUTC(11, offset, 18),
    type: "expense",
    category: "Groceries",
    categoryIcon: "🛒",
    addedById: "blake",
  },
  {
    amount: 13125,
    description: "Groceries",
    date: dayUTC(18, offset, 18),
    type: "expense",
    category: "Groceries",
    categoryIcon: "🛒",
    addedById: "avery",
  },
  {
    amount: 10980,
    description: "Groceries",
    date: dayUTC(25, offset, 18),
    type: "expense",
    category: "Groceries",
    categoryIcon: "🛒",
    addedById: "avery",
  },
  {
    amount: 8420,
    description: "Dinner out",
    date: dayUTC(9, offset, 20),
    type: "expense",
    category: "Dining Out",
    categoryIcon: "🍽️",
    addedById: "blake",
  },
  {
    amount: 7680,
    description: "Brunch",
    date: dayUTC(21, offset, 14),
    type: "expense",
    category: "Dining Out",
    categoryIcon: "🍽️",
    addedById: "avery",
  },
  {
    amount: 1499,
    description: "Netflix",
    date: dayUTC(15, offset, 19),
    type: "expense",
    category: "Subscriptions",
    categoryIcon: "📺",
    addedById: "avery",
  },
  {
    amount: 1199,
    description: "Spotify",
    date: dayUTC(15, offset, 17),
    type: "expense",
    category: "Subscriptions",
    categoryIcon: "📺",
    addedById: "blake",
  },
  {
    amount: 3999,
    description: "Gym",
    date: dayUTC(8, offset, 7),
    type: "expense",
    category: "Subscriptions",
    categoryIcon: "📺",
    addedById: "blake",
  },
  {
    amount: 35000,
    description: "Vacation fund",
    date: dayUTC(20, offset, 21),
    type: "expense",
    category: "Travel",
    categoryIcon: "✈️",
    addedById: "avery",
    goal: "vacation",
  },
  {
    amount: 1450,
    description: "Work lunch",
    date: dayUTC(16, offset, 12),
    type: "expense",
    category: "Dining Out",
    categoryIcon: "🍽️",
    addedById: "avery",
  },
];

const dayUTC = (day, offset, hour = 12) =>
  new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, day, hour),
  );

async function clean() {
  await prisma.$transaction([
    prisma.settlement.deleteMany(),
    prisma.transactionShare.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.apiToken.deleteMany(),
    prisma.budget.deleteMany(),
    prisma.goal.deleteMany(),
    prisma.category.deleteMany(),
    prisma.monthHistory.deleteMany(),
    prisma.yearHistory.deleteMany(),
    prisma.inviteLink.deleteMany(),
    prisma.recurringItem.deleteMany(),
    prisma.walletMembership.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
    prisma.wallet.deleteMany(),
    prisma.rateLimit.deleteMany(),
  ]);
}

async function createUser({ id, name, email, password }) {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      id,
      name,
      email,
      emailVerified: true,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: id,
          providerId: "credential",
          password: passwordHash,
        },
      },
    },
  });
}

async function main() {
  await clean();

  const averyId = randomUUID();
  const blakeId = randomUUID();
  const walletId = randomUUID();

  await createUser({
    id: averyId,
    name: "Avery Quinn",
    email: primaryEmail,
    password: primaryPassword,
  });
  await createUser({
    id: blakeId,
    name: "Blake Rivera",
    email: memberEmail,
    password: memberPassword,
  });

  await prisma.wallet.create({
    data: {
      id: walletId,
      name: "The Rivera Wallet",
      currency: "USD",
      agentAccessEnabled: true,
      createdAt: new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 7, 1, 12),
      ),
    },
  });

  const joined = (daysAgo) => new Date(now.getTime() - daysAgo * 86_400_000);
  await prisma.walletMembership.createMany({
    data: [
      { walletId, userId: averyId, role: "member", joinedAt: joined(224) },
      { walletId, userId: blakeId, role: "member", joinedAt: joined(187) },
    ],
  });

  await prisma.category.createMany({
    data: [
      { walletId, name: "Salary", icon: "💰", type: "income" },
      { walletId, name: "Freelance", icon: "💻", type: "income" },
      { walletId, name: "Rent", icon: "🏠", type: "expense" },
      { walletId, name: "Groceries", icon: "🛒", type: "expense" },
      { walletId, name: "Utilities", icon: "💡", type: "expense" },
      { walletId, name: "Dining Out", icon: "🍽️", type: "expense" },
      { walletId, name: "Subscriptions", icon: "📺", type: "expense" },
      { walletId, name: "Travel", icon: "✈️", type: "expense" },
      { walletId, name: "Pharmacy", icon: "💊", type: "expense" },
      { walletId, name: "Gift", icon: "🎁", type: "expense" },
      { walletId, name: "Car", icon: "🚗", type: "expense" },
      { walletId, name: "Transfer", icon: "🐷", type: "expense" },
      { walletId, name: "Photography", icon: "📷", type: "expense" },
    ],
  });

  // Goals: Vacation is mid-flight, Emergency funded, Camera is a stalled one.
  const vacation = await prisma.goal.create({
    data: {
      walletId,
      name: "Vacation",
      target: 3000,
      deadline: new Date(Date.UTC(now.getUTCFullYear() + 1, 5, 1)),
    },
  });
  const emergency = await prisma.goal.create({
    data: {
      walletId,
      name: "Emergency fund",
      target: 2000,
      deadline: null,
    },
  });
  const camera = await prisma.goal.create({
    data: {
      walletId,
      name: "New camera",
      target: 1200,
      deadline: null,
    },
  });

  await prisma.budget.createMany({
    data: [
      { walletId, category: "Groceries", amount: 650, mode: "soft" },
      { walletId, category: "Dining Out", amount: 150, mode: "soft" },
      { walletId, category: "Travel", amount: 500, mode: "soft" },
    ],
  });

  await prisma.recurringItem.createMany({
    data: [
      {
        walletId,
        name: "Rent",
        amount: 1450,
        category: "Rent",
        categoryIcon: "🏠",
        frequency: "monthly",
        dayOfMonth: 2,
        startDate: dayUTC(2, MONTHS_BACK, 8),
        lastPostedAt: dayUTC(2, 0, 8),
      },
      {
        walletId,
        name: "Internet",
        amount: 70,
        category: "Utilities",
        categoryIcon: "💡",
        frequency: "monthly",
        dayOfMonth: 7,
        startDate: dayUTC(7, MONTHS_BACK, 19),
        lastPostedAt: dayUTC(7, 0, 19),
      },
      {
        walletId,
        name: "Power",
        amount: 128.4,
        category: "Utilities",
        categoryIcon: "💡",
        frequency: "monthly",
        dayOfMonth: 12,
        startDate: dayUTC(12, MONTHS_BACK, 19),
        lastPostedAt: dayUTC(12, 0, 19),
      },
      {
        walletId,
        name: "Netflix",
        amount: 14.99,
        category: "Subscriptions",
        categoryIcon: "📺",
        frequency: "monthly",
        dayOfMonth: 15,
        startDate: dayUTC(15, MONTHS_BACK, 19),
        lastPostedAt: dayUTC(15, 0, 19),
      },
      {
        walletId,
        name: "Gym",
        amount: 39.99,
        category: "Subscriptions",
        categoryIcon: "📺",
        frequency: "monthly",
        dayOfMonth: 8,
        startDate: dayUTC(8, MONTHS_BACK, 7),
        lastPostedAt: dayUTC(8, 0, 7),
      },
    ],
  });

  const created = [];
  const addRow = async (row) => {
    const { shares, goal, member, addedById, ...data } = row;
    const addedBy = (member ?? addedById) === "blake" ? blakeId : averyId;
    const tx = await prisma.transaction.create({
      data: {
        walletId,
        addedVia: null,
        createdAt: data.date,
        updatedAt: data.date,
        amount: centsToDecimal(data.amount),
        description: data.description,
        date: data.date,
        addedById: addedBy,
        type: data.type,
        category: data.category,
        categoryIcon: data.categoryIcon,
        goalId:
          goal === "vacation"
            ? vacation.id
            : goal === "emergency"
              ? emergency.id
              : goal === "camera"
                ? camera.id
                : undefined,
      },
    });
    if (shares === "rent") {
      await prisma.transactionShare.createMany({
        data: [
          {
            transactionId: tx.id,
            userId: averyId,
            amount: centsToDecimal(60000),
          },
          {
            transactionId: tx.id,
            userId: blakeId,
            amount: centsToDecimal(85000),
          },
        ],
      });
    }
    created.push({ tx, data });
  };

  const pending = [];
  const pushRow = (row) => pending.push(row);

  const FREE_LANCE_MONTHS = new Set([2, 4]);
  for (let offset = MONTHS_BACK; offset >= 0; offset -= 1) {
    for (const row of MONTHLY_ROWS(offset)) {
      if (row.date > now) continue;
      if (FREE_LANCE_MONTHS.has(offset)) {
        pushRow({
          amount: 75000,
          description: "Freelance (Avery)",
          date: dayUTC(14, offset, 16),
          type: "income",
          category: "Freelance",
          categoryIcon: "💻",
          addedById: "avery",
          member: "avery",
        });
      }
      pushRow(row);
    }
    if (offset === 2) {
      pushRow({
        amount: 68000,
        description: "Car service",
        date: dayUTC(26, offset, 9),
        type: "expense",
        category: "Car",
        categoryIcon: "🚗",
        addedById: "blake",
        member: "blake",
      });
    }
    if (offset === 3) {
      pushRow({
        amount: 9550,
        description: "Anniversary gift",
        date: dayUTC(22, offset, 13),
        type: "expense",
        category: "Gift",
        categoryIcon: "🎁",
        addedById: "avery",
        member: "avery",
      });
    }
    if (offset === 4) {
      pushRow({
        amount: 4230,
        description: "Pharmacy",
        date: dayUTC(13, offset, 11),
        type: "expense",
        category: "Pharmacy",
        categoryIcon: "💊",
        addedById: "blake",
        member: "blake",
      });
    }
  }
  await Promise.all(pending.map((row) => addRow(row)));

  // Emergency fund: two 1000 deposits five and two months ago → fully funded
  await addRow({
    amount: 100000,
    description: "Emergency fund deposit",
    date: dayUTC(10, 5, 9),
    type: "expense",
    category: "Transfer",
    categoryIcon: "🐷",
    addedById: "avery",
    member: "avery",
    goal: "emergency",
  });
  await addRow({
    amount: 100000,
    description: "Emergency fund deposit",
    date: dayUTC(10, 3, 9),
    type: "expense",
    category: "Transfer",
    categoryIcon: "🐷",
    addedById: "blake",
    member: "blake",
    goal: "emergency",
  });
  // Camera: 125 a month for three months → 375 of 1200
  await Promise.all(
    [3, 2, 1].map((offset) =>
      addRow({
        amount: 12500,
        description: "Camera saving",
        date: dayUTC(25, offset, 22),
        type: "expense",
        category: "Photography",
        categoryIcon: "📷",
        addedById: "blake",
        member: "blake",
        goal: "camera",
      }),
    ),
  );

  // A settlement from Blake to Avery, last month, to soften the balance.
  // The overview shows "Blake owes Avery" far below the minimal fixture's
  // frozen $870.25 but never negative in realistic numbers.
  const settlementDate = dayUTC(15, 1, 20);
  await prisma.settlement.create({
    data: {
      walletId,
      payerId: blakeId,
      receiverId: averyId,
      amount: centsToDecimal(25000),
      date: settlementDate,
    },
  });

  // Rebuild month/year history rollups from the created ledger rows.
  const months = new Map();
  const years = new Map();
  for (const { tx, data } of created) {
    if (data.type !== "income" && data.type !== "expense") continue;
    const field = data.type;
    const monthKey = `${tx.date.getUTCFullYear()}-${tx.date.getUTCMonth()}-${tx.date.getUTCDate()}`;
    const yearKey = `${tx.date.getUTCFullYear()}-${tx.date.getUTCMonth()}`;
    const month = months.get(monthKey) ?? { income: 0, expense: 0 };
    const year = years.get(yearKey) ?? { income: 0, expense: 0 };
    month[field] += Number(data.amount);
    year[field] += Number(data.amount);
    months.set(monthKey, month);
    years.set(yearKey, year);
  }
  await Promise.all(
    [...months].map(([key, totals]) => {
      const [year, month, day] = key.split("-").map(Number);
      return prisma.monthHistory.create({
        data: {
          walletId,
          day,
          month,
          year,
          income: centsToDecimal(totals.income),
          expense: centsToDecimal(totals.expense),
        },
      });
    }),
  );
  await Promise.all(
    [...years].map(([key, totals]) => {
      const [year, month] = key.split("-").map(Number);
      return prisma.yearHistory.create({
        data: {
          walletId,
          month,
          year,
          income: centsToDecimal(totals.income),
          expense: centsToDecimal(totals.expense),
        },
      });
    }),
  );

  const readWriteToken = newToken();
  const readOnlyToken = newToken();
  await prisma.apiToken.createMany({
    data: [
      {
        walletId,
        userId: averyId,
        name: "average read-write",
        scope: "read-write",
        tokenHash: hashToken(readWriteToken),
      },
      {
        walletId,
        userId: blakeId,
        name: "average read-only",
        scope: "read-only",
        tokenHash: hashToken(readOnlyToken),
      },
    ],
  });

  // Expected values, computed from the rows we really seeded.
  const all = await prisma.transaction.findMany({
    where: { walletId },
    select: { amount: true, type: true, addedById: true, date: true, id: true },
  });
  const memberCount = 2;
  const thisMonth = now.getUTCMonth();
  const thisYear = now.getUTCFullYear();
  const thisMonthRows = all.filter(
    (r) =>
      r.date.getUTCMonth() === thisMonth &&
      r.date.getUTCFullYear() === thisYear,
  );
  const income = thisMonthRows
    .filter((r) => r.type === "income")
    .reduce((s, r) => s + Number(r.amount), 0);
  const expenses = thisMonthRows
    .filter((r) => r.type === "expense")
    .reduce((s, r) => s + Number(r.amount), 0);

  // Per-user settlement-aware balances (even split for non-rent, explicit
  // 600/850 rent split, settlements subtract from the payer).
  const withShares = await prisma.transaction.findMany({
    where: { walletId },
    include: { shares: true },
  });
  const settlements = await prisma.settlement.findMany({ where: { walletId } });
  const balanceFor = (callerId, otherId) => {
    let balance = 0;
    for (const tx of withShares) {
      if (tx.type !== "expense") continue;
      const shares = tx.shares.length
        ? tx.shares.map((s) => ({ userId: s.userId, amount: Number(s.amount) }))
        : [
            { userId: averyId, amount: Number(tx.amount) / memberCount },
            { userId: blakeId, amount: Number(tx.amount) / memberCount },
          ];
      const callerShare =
        shares.find((s) => s.userId === callerId)?.amount ?? 0;
      const otherShare = shares.find((s) => s.userId === otherId)?.amount ?? 0;
      if (tx.addedById === otherId) balance += callerShare;
      else if (tx.addedById === callerId) balance -= otherShare;
    }
    for (const settlement of settlements) {
      const amount = Number(settlement.amount);
      if (
        settlement.payerId === callerId &&
        settlement.receiverId === otherId
      ) {
        balance -= amount;
      } else if (
        settlement.payerId === otherId &&
        settlement.receiverId === callerId
      ) {
        balance += amount;
      }
    }
    return balance;
  };
  const blakeOwesAvery = balanceFor(averyId, blakeId);
  const budgetThisMonth = async (category) => {
    const agg = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        walletId,
        type: "expense",
        category,
        date: { gte: new Date(Date.UTC(thisYear, thisMonth, 1)) },
      },
    });
    return agg._sum.amount ? Number(agg._sum.amount) : 0;
  };
  const groceriesSpentC = await budgetThisMonth("Groceries");
  const diningSpentC = await budgetThisMonth("Dining Out");

  const vacationContributed = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { walletId, type: "expense", goalId: vacation.id },
  });
  const vacationC = vacationContributed._sum.amount
    ? Number(vacationContributed._sum.amount)
    : 0;
  const emergencyContributed = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { walletId, type: "expense", goalId: emergency.id },
  });
  const emergencyC = emergencyContributed._sum.amount
    ? Number(emergencyContributed._sum.amount)
    : 0;
  const cameraContributed = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { walletId, type: "expense", goalId: camera.id },
  });
  const cameraC = cameraContributed._sum.amount
    ? Number(cameraContributed._sum.amount)
    : 0;

  const totalTx = withShares.length;

  const summary = {
    runId,
    walletId,
    users: [primaryEmail, memberEmail],
    tokens: ["read-write", "read-only"],
    transactions: totalTx,
    fixtures: path.join(stateDir, "fixtures.json"),
    expected: {
      income: income.toFixed(2),
      expenses: expenses.toFixed(2),
      net: (income - expenses).toFixed(2),
      groceriesSpent: fmt(groceriesSpentC),
      groceriesBudget: 650,
      diningSpent: fmt(diningSpentC),
      diningBudget: 150,
      vacation: { target: 3000, contributed: fmt(vacationC) },
      emergency: { target: 2000, contributed: fmt(emergencyC) },
      camera: { target: 1200, contributed: fmt(cameraC) },
      blakeOwesAvery: blakeOwesAvery.toFixed(2),
    },
  };

  const expectedFixtures = {
    runId,
    baseUrl,
    walletId,
    currency: "USD",
    members: {
      avery: { id: averyId, email: primaryEmail, name: "Avery Quinn" },
      blake: { id: blakeId, email: memberEmail, name: "Blake Rivera" },
    },
    goalId: vacation.id,
    goalIds: {
      vacation: vacation.id,
      emergency: emergency.id,
      camera: camera.id,
    },
    tokens: { readWrite: readWriteToken, readOnly: readOnlyToken },
    expected: {
      overview: {
        income: Number(income.toFixed(2)),
        expenses: Number(expenses.toFixed(2)),
        net: Number((income - expenses).toFixed(2)),
      },
      balances: {
        // get_balances is relative to the caller.
        averySeesBlake: -blakeOwesAvery,
        blakeOwesAvery,
      },
      budgets: [
        {
          category: "Groceries",
          amount: 650,
          spent: Number(groceriesSpentC.toFixed(2)),
          remaining: Number(Math.max(0, 650 - groceriesSpentC).toFixed(2)),
          percent: Math.round((groceriesSpentC / 650) * 1000) / 10,
          mode: "soft",
        },
        {
          category: "Dining Out",
          amount: 150,
          spent: Number(diningSpentC.toFixed(2)),
          remaining: Number(Math.max(0, 150 - diningSpentC).toFixed(2)),
          percent: Math.round((diningSpentC / 150) * 1000) / 10,
          mode: "soft",
        },
      ],
      goals: [
        {
          name: "Vacation",
          target: 3000,
          contributed: Number(vacationC.toFixed(2)),
        },
        {
          name: "Emergency fund",
          target: 2000,
          contributed: Number(emergencyC.toFixed(2)),
        },
        {
          name: "New camera",
          target: 1200,
          contributed: Number(cameraC.toFixed(2)),
        },
      ],
      categories: {
        income: ["Freelance", "Salary"],
        expense: [
          "Car",
          "Dining Out",
          "Gift",
          "Groceries",
          "Pharmacy",
          "Rent",
          "Subscriptions",
          "Transfer",
          "Travel",
          "Utilities",
        ],
      },
    },
  };

  const fixturePath = path.join(stateDir, "fixtures.json");
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(fixturePath, JSON.stringify(expectedFixtures, null, 2) + "\n");

  const env = [
    `SORA_VERIFY_URL=${baseUrl}/api/mcp`,
    `SORA_VERIFY_TOKEN=${readWriteToken}`,
    `SORA_VERIFY_READ_ONLY_TOKEN=${readOnlyToken}`,
    `SORA_VERIFY_EMAIL=${primaryEmail}`,
    `SORA_VERIFY_PASSWORD=${primaryPassword}`,
    `SORA_VERIFY_MEMBER_EMAIL=${memberEmail}`,
    `SORA_VERIFY_MEMBER_PASSWORD=${memberPassword}`,
    `SORA_VERIFY_WALLET_ID=${walletId}`,
    `SORA_VERIFY_USER_ID=${averyId}`,
    `SORA_VERIFY_MEMBER_ID=${blakeId}`,
    `SORA_VERIFY_GOAL_ID=${vacation.id}`,
    "",
  ].join("\n");
  writeFileSync(path.join(stateDir, "run.env"), env);

  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
