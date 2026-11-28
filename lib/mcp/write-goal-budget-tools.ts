import type { McpContext } from "./context";
import type { UpdateGoalSchemaType } from "@/schemas/goals";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { deleteWalletBudget, setWalletBudget } from "@/lib/budgets";
import { DATE_PATTERN, parseDate } from "@/lib/dates";
import {
  createWalletGoal,
  deleteWalletGoal,
  updateWalletGoal,
} from "@/lib/goals";
import { budgetFields } from "@/schemas/budgets";
import { DeleteIdSchema } from "@/schemas/delete";
import { goalFields } from "@/schemas/goals";

import { runTool } from "./tools";

const DEADLINE_PATTERN = DATE_PATTERN;

export function registerGoalBudgetWriteTools(
  server: McpServer,
  context: McpContext,
) {
  const goalInput = goalFields(false);
  const budgetInput = budgetFields(false);
  server.registerTool(
    "delete_goal",
    {
      title: "Delete goal",
      description:
        "Delete a Goal from the Wallet. Transactions tagged with the Goal keep the money in the ledger and lose the tag. Use list_goals to find the Goal's id.",
      inputSchema: {
        id: DeleteIdSchema.shape.id.describe(
          "Id of the Goal to delete. Use list_goals to see them.",
        ),
      },
    },
    async ({ id }) =>
      runTool(context, "write", async () => {
        await deleteWalletGoal(context, id);

        return { deleted: id };
      }),
  );

  server.registerTool(
    "delete_budget",
    {
      title: "Delete budget",
      description:
        "Delete the Wallet's Budget for one expense Category. Use list_budgets to find the Budget's id.",
      inputSchema: {
        id: DeleteIdSchema.shape.id.describe(
          "Id of the Budget to delete. Use list_budgets to see them.",
        ),
      },
    },
    async ({ id }) =>
      runTool(context, "write", async () => {
        await deleteWalletBudget(context, id);

        return { deleted: id };
      }),
  );

  server.registerTool(
    "create_goal",
    {
      title: "Create goal",
      description:
        "Create a Goal in the Wallet: an amount to save, with an optional deadline. A Goal is not tied to a Transaction; money reaches it through Transactions tagged with the Goal.",
      inputSchema: {
        name: goalInput.name.describe("Name of the Goal, up to 50 characters."),
        target: goalInput.target.describe(
          "Amount to save, in the Wallet's currency.",
        ),
        deadline: z
          .string()
          .regex(DEADLINE_PATTERN)
          .optional()
          .describe("Deadline as YYYY-MM-DD. Optional."),
      },
    },
    async ({ name, target, deadline }) =>
      runTool(context, "write", async () => {
        const goal = await createWalletGoal(context, {
          name,
          target,
          deadline: deadline ? parseDate(deadline) : undefined,
        });

        return {
          id: goal.id,
          name: goal.name,
          target: goal.target,
          deadline: goal.deadline?.toISOString() ?? null,
        };
      }),
  );

  server.registerTool(
    "update_goal",
    {
      title: "Update goal",
      description:
        "Update a Goal in the Wallet: its name, target, or deadline. Only the fields provided change. Transactions tagged with the Goal are not affected. Use list_goals to find the Goal's id.",
      inputSchema: {
        id: z
          .string()
          .min(1)
          .describe("Id of the Goal to update. Use list_goals to see them."),
        name: goalInput.name
          .optional()
          .describe("New name for the Goal, up to 50 characters."),
        target: goalInput.target
          .optional()
          .describe("New amount to save, in the Wallet's currency."),
        deadline: z
          .union([z.literal(""), z.string().regex(DEADLINE_PATTERN)])
          .nullable()
          .optional()
          .describe(
            "New deadline as YYYY-MM-DD, or null (or an empty string) to clear it. Omit to leave it unchanged.",
          ),
      },
    },
    async ({ id, name, target, deadline }) =>
      runTool(context, "write", async () => {
        const update: UpdateGoalSchemaType = { id };
        if (name !== undefined) {
          update.name = name;
        }
        if (target !== undefined) {
          update.target = target;
        }
        if (deadline !== undefined) {
          update.deadline =
            deadline === null || deadline === "" ? null : parseDate(deadline);
        }

        const goal = await updateWalletGoal(context, update);

        return {
          id: goal.id,
          name: goal.name,
          target: goal.target,
          deadline: goal.deadline?.toISOString() ?? null,
        };
      }),
  );

  server.registerTool(
    "set_budget",
    {
      title: "Set budget",
      description:
        "Set the Wallet's monthly Budget for one expense Category: the limit, and whether it is soft (warns at the limit) or hard (rejects expenses over it). A Wallet has one Budget per Category, so setting a Category that already has one replaces its limit.",
      inputSchema: {
        category: budgetInput.category.describe(
          "Name of an expense Category in the Wallet. Use list_categories to see them.",
        ),
        amount: budgetInput.amount.describe(
          "Monthly limit, in the Wallet's currency.",
        ),
        mode: budgetInput.mode
          .default("soft")
          .describe("Soft warns at the limit; hard rejects expenses over it."),
      },
    },
    async ({ category, amount, mode }) =>
      runTool(context, "write", async () => {
        const budget = await setWalletBudget(context, {
          category,
          amount,
          mode,
        });

        return {
          id: budget.id,
          category: budget.category,
          amount: budget.amount,
          mode: budget.mode,
        };
      }),
  );
}
