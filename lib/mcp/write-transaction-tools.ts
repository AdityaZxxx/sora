import type { McpContext } from "./context";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { parseDate, todayAtUtcMidnight } from "@/lib/dates";
import { moneyText } from "@/lib/money";
import { recordSettlement } from "@/lib/settlements";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/lib/transactions";
import { DeleteIdSchema } from "@/schemas/delete";
import { settlementFields } from "@/schemas/settlement";
import { transactionFields } from "@/schemas/transaction";

import { runTool } from "./tools";

export function registerTransactionWriteTools(
  server: McpServer,
  context: McpContext,
) {
  const transactionInput = transactionFields(false);
  const settlementInput = settlementFields(false);

  server.registerTool(
    "add_transaction",
    {
      title: "Add transaction",
      description:
        "Add an expense or income Transaction to the Wallet's ledger. It counts towards the Wallet's balances, Budgets and Goals.",
      inputSchema: {
        amount: transactionInput.amount.describe(
          "Amount, in the Wallet's currency.",
        ),
        description: transactionInput.description.describe(
          "What the Transaction was for, up to 200 characters.",
        ),
        date: z
          .string()
          .optional()
          .describe("Date as YYYY-MM-DD. Defaults to today."),
        category: transactionInput.category.describe(
          "Name of a Category in the Wallet. Use list_categories to see them.",
        ),
        type: transactionInput.type
          .default("expense")
          .describe("Expense or income."),
        goalId: transactionInput.goalId.describe(
          "Id of a Goal in the Wallet the Transaction contributes to.",
        ),
        shares: transactionInput.shares.describe(
          "Per-member split of an expense, as amounts in the Wallet's currency. The amounts must add up to the Transaction's amount. Use list_members to get the member ids.",
        ),
        recurringItemId: transactionInput.recurringItemId.describe(
          "Id of a Recurring item in the Wallet this Transaction records. Optional; carries the item as posted for this occurrence.",
        ),
      },
    },
    async ({
      amount,
      description,
      date,
      category,
      type,
      goalId,
      shares,
      recurringItemId,
    }) =>
      runTool(context, "write", async () => {
        const transaction = await createTransaction(context, {
          amount,
          description,
          date: date ? parseDate(date) : todayAtUtcMidnight(),
          category,
          type,
          goalId: goalId || undefined,
          shares,
          recurringItemId,
          addedVia: "agent",
        });

        return {
          id: transaction.id,
          date: transaction.date.toISOString(),
          description: transaction.description,
          amount: moneyText(transaction.amount),
          type: transaction.type,
          category: transaction.category,
        };
      }),
  );

  server.registerTool(
    "update_transaction",
    {
      title: "Update transaction",
      description:
        "Update a Transaction in the Wallet. You may edit only your own entries unless you are an owner or co-owner. Transactions with split shares cannot be edited yet. Amount, date, type and category changes move the wallet rollups in the same write.",
      inputSchema: {
        id: DeleteIdSchema.shape.id.describe(
          "Id of the Transaction to update. Use list_transactions to find it.",
        ),
        amount: transactionInput.amount.describe(
          "New amount, in the Wallet's currency.",
        ),
        description: transactionInput.description.describe(
          "New description, up to 200 characters.",
        ),
        date: z.string().describe("New date as YYYY-MM-DD."),
        category: transactionInput.category.describe(
          "Name of a Category in the Wallet.",
        ),
        type: transactionInput.type.describe("Expense or income."),
      },
    },
    async ({ id, amount, description, date, category, type }) =>
      runTool(context, "write", async () => {
        const transaction = await updateTransaction(context, {
          id,
          amount,
          description,
          date: parseDate(date),
          category,
          type,
        });

        return {
          id: transaction.id,
          date: transaction.date.toISOString(),
          description: transaction.description,
          amount: moneyText(transaction.amount),
          type: transaction.type,
          category: transaction.category,
        };
      }),
  );

  server.registerTool(
    "delete_transaction",
    {
      title: "Delete transaction",
      description:
        "Delete a Transaction from the Wallet's ledger. The Wallet's balances and history rollups move with it. Use list_transactions to find the Transaction's id.",
      inputSchema: {
        id: DeleteIdSchema.shape.id.describe(
          "Id of the Transaction to delete. Use list_transactions to see them.",
        ),
      },
    },
    async ({ id }) =>
      runTool(context, "write", async () => {
        await deleteTransaction(context, id);

        return { deleted: id };
      }),
  );

  server.registerTool(
    "record_settlement",
    {
      title: "Record settlement",
      description:
        "Record a Settlement the caller personally paid or received. The caller is always one of the two parties. No money moves inside the app.",
      inputSchema: {
        memberId: settlementInput.memberId.describe(
          "Id of the other Member in the settlement. Use get_balances to see them.",
        ),
        amount: settlementInput.amount.describe(
          "Amount that moved outside the app, in the Wallet's currency.",
        ),
        direction: settlementInput.direction.describe(
          "paid when the caller paid the other Member, received when the caller was paid.",
        ),
      },
    },
    async ({ memberId, amount, direction }) =>
      runTool(context, "write", async () => {
        const settlement = await recordSettlement(context, {
          memberId,
          amount,
          direction,
          addedVia: "agent",
        });

        return {
          id: settlement.id,
          date: settlement.date.toISOString(),
          amount: moneyText(settlement.amount),
          payerId: settlement.payerId,
          receiverId: settlement.receiverId,
        };
      }),
  );
}
