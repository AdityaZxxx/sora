import type { McpContext } from "./context";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { getMemberBalances } from "@/lib/balances";
import { getBudgetsWithProgress } from "@/lib/budgets";
import { getCategories } from "@/lib/categories";
import { resolveDateRange } from "@/lib/dates";
import { getGoalsWithProgress } from "@/lib/goals";
import { listMembers } from "@/lib/members";
import { moneyText } from "@/lib/money";
import { listSettlements } from "@/lib/settlements";
import {
  getBalanceStats,
  getTransactionsHistory,
  type GetTransactionsHistoryResponseType,
} from "@/lib/transactions";

import { dateRangeSchema, runTool } from "./tools";

export function registerReadTools(server: McpServer, context: McpContext) {
  server.registerTool(
    "get_overview",
    {
      title: "Get overview",
      description:
        "Total income, expenses, and net balance for the Wallet over a date range. Counts every Transaction in the Wallet's ledger.",
      inputSchema: dateRangeSchema,
    },
    async ({ from, to }) =>
      runTool(context, "read", async () => {
        const range = resolveDateRange(from, to);
        const stats = await getBalanceStats(
          context.walletId,
          range.from,
          range.to,
        );

        return {
          from: range.from.toISOString(),
          to: range.to.toISOString(),
          income: moneyText(stats.income),
          expenses: moneyText(stats.expense),
          net: moneyText(stats.net),
        };
      }),
  );

  server.registerTool(
    "list_transactions",
    {
      title: "List transactions",
      description: "Transactions in the Wallet over a date range.",
      inputSchema: {
        ...dateRangeSchema,
        category: z
          .string()
          .optional()
          .describe("Only Transactions in this category."),
      },
    },
    async ({ from, to, category }) =>
      runTool(context, "read", async () => {
        const range = resolveDateRange(from, to);
        const transactions: GetTransactionsHistoryResponseType["transactions"] =
          [];
        let cursor: string | null = null;
        do {
          // oxlint-disable-next-line eslint/no-await-in-loop -- the next page needs this page's cursor
          const page = await getTransactionsHistory(
            context.walletId,
            range.from,
            range.to,
            { category, cursor },
          );
          transactions.push(...page.transactions);
          cursor = page.nextCursor;
        } while (cursor);

        return {
          from: range.from.toISOString(),
          to: range.to.toISOString(),
          transactions: transactions.map((transaction) => ({
            id: transaction.id,
            date: transaction.date.toISOString(),
            description: transaction.description,
            amount: moneyText(transaction.amount),
            type: transaction.type,
            category: transaction.category,
            addedBy: transaction.addedByName,
          })),
        };
      }),
  );

  server.registerTool(
    "get_balances",
    {
      title: "Get balances",
      description:
        "What each other Member owes the caller, or what the caller owes them, from the Wallet's Transactions and Settlements.",
      inputSchema: {},
    },
    async () =>
      runTool(context, "read", async () => {
        const balances = await getMemberBalances(
          context.walletId,
          context.userId,
        );

        return {
          balances: balances.map((balance) => ({
            memberId: balance.userId,
            memberName: balance.name,
            balance: moneyText(balance.balance),
            status:
              balance.balance === 0
                ? "settled"
                : balance.balance > 0
                  ? "you_owe"
                  : "they_owe_you",
          })),
        };
      }),
  );

  server.registerTool(
    "list_budgets",
    {
      title: "List budgets",
      description:
        "The Wallet's monthly Budgets, with what has been spent against each one this month.",
      inputSchema: {},
    },
    async () =>
      runTool(context, "read", async () => {
        const budgets = await getBudgetsWithProgress(context.walletId);

        return {
          budgets: budgets.map((budget) => ({
            id: budget.id,
            category: budget.category,
            amount: moneyText(budget.amount),
            mode: budget.mode,
            spent: moneyText(budget.spent),
            remaining: moneyText(budget.remaining),
            percent: budget.percent,
          })),
        };
      }),
  );

  server.registerTool(
    "list_goals",
    {
      title: "List goals",
      description:
        "The Wallet's Goals, with how much has been contributed towards each one.",
      inputSchema: {},
    },
    async () =>
      runTool(context, "read", async () => {
        const goals = await getGoalsWithProgress(context.walletId);

        return {
          goals: goals.map((goal) => ({
            id: goal.id,
            name: goal.name,
            target: moneyText(goal.target),
            contributed: moneyText(goal.contributed),
            deadline: goal.deadline?.toISOString() ?? null,
          })),
        };
      }),
  );

  server.registerTool(
    "list_members",
    {
      title: "List members",
      description:
        "Every member of the Wallet with their id, name and role. Use these ids for transactions, settlements and shares.",
      inputSchema: {},
    },
    async () =>
      runTool(context, "read", async () => {
        const memberships = await listMembers(context.walletId);

        return {
          members: memberships.map((membership) => ({
            id: membership.userId,
            name: membership.user.name,
            role: membership.role,
          })),
        };
      }),
  );

  server.registerTool(
    "list_categories",
    {
      title: "List categories",
      description:
        "The Wallet's Categories. Use these when adding a Transaction, since a Transaction's category must match one of them.",
      inputSchema: {
        type: z
          .enum(["expense", "income"])
          .optional()
          .describe("Only Categories of this type."),
      },
    },
    async ({ type }) =>
      runTool(context, "read", async () => {
        const categories = await getCategories(context.walletId, type);

        return {
          categories: categories.map((category) => ({
            id: category.id,
            name: category.name,
            icon: category.icon,
            iconKind: category.iconKind,
            iconColor: category.iconColor,
            type: category.type,
          })),
        };
      }),
  );
  server.registerTool(
    "list_settlements",
    {
      title: "List settlements",
      description:
        "Settlements recorded in this Wallet. Only the two parties see amounts and names; other members see a masked entry.",
      inputSchema: {},
    },
    async () =>
      runTool(context, "read", async () => {
        const settlements = await listSettlements(
          context.walletId,
          context.userId,
        );
        return {
          settlements: settlements.map((settlement) => ({
            id: settlement.id,
            date: settlement.date.toISOString(),
            amount:
              settlement.amount === null ? null : moneyText(settlement.amount),
            payerName: settlement.payerName,
            receiverName: settlement.receiverName,
          })),
        };
      }),
  );
}
