import type { McpContext } from "./context";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { parseDate, todayAtUtcMidnight } from "@/lib/dates";
import { recordSettlement } from "@/lib/settlements";
import { createTransaction, deleteTransaction } from "@/lib/transactions";
import { DeleteIdSchema } from "@/schemas/delete";
import { settlementFields } from "@/schemas/settlement";
import { transactionFields } from "@/schemas/transaction";

import { runWriteTool } from "./tools";

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
      runWriteTool(async () => {
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
          currency: context.currency,
          date: transaction.date.toISOString(),
          description: transaction.description,
          amount: transaction.amount.toNumber(),
          type: transaction.type,
          category: transaction.category,
          memberId: context.userId,
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
      runWriteTool(async () => {
        await deleteTransaction(context, id);

        return { deleted: id, memberId: context.userId };
      }),
  );

  server.registerTool(
    "record_settlement",
    {
      title: "Record settlement",
      description:
        "Record a Settlement: the caller paid the other Member back what the caller owed them. Use it when get_balances shows the caller owes that Member. No money moves inside the app.",
      inputSchema: {
        memberId: settlementInput.memberId.describe(
          "Id of the Member the caller paid back. Use get_balances to see them.",
        ),
        amount: settlementInput.amount.describe(
          "Amount paid back, in the Wallet's currency.",
        ),
      },
    },
    async ({ memberId, amount }) =>
      runWriteTool(async () => {
        const settlement = await recordSettlement(context, {
          memberId,
          amount,
          addedVia: "agent",
        });

        return {
          id: settlement.id,
          currency: context.currency,
          date: settlement.date.toISOString(),
          amount: settlement.amount.toNumber(),
          receiverId: settlement.receiverId,
          memberId: context.userId,
        };
      }),
  );
}
