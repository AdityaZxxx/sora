import type { McpContext } from "./context";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  createWalletCategory,
  deleteWalletCategory,
  updateWalletCategory,
} from "@/lib/categories";
import { categoryFields, categoryLookupNameSchema } from "@/schemas/categories";
import { DeleteIdSchema } from "@/schemas/delete";

import { runTool } from "./tools";

export function registerCategoryWriteTools(
  server: McpServer,
  context: McpContext,
) {
  const fields = categoryFields();

  server.registerTool(
    "create_category",
    {
      title: "Create category",
      description:
        "Create a Category in the Wallet: a label for Transactions, of type expense or income. A Transaction's category must match one of the Wallet's Categories.",
      inputSchema: {
        name: fields.name.describe("Name of the Category, 3 to 20 characters."),
        icon: fields.icon.describe(
          "Icon for the Category: an emoji glyph, or a Lucide icon name from the curated set when iconKind is lucide.",
        ),
        iconKind: fields.iconKind.describe(
          "Icon kind. Defaults to emoji. Use lucide for a curated Lucide icon.",
        ),
        iconColor: fields.iconColor.describe(
          "Hex color for a Lucide icon, such as #3b82f6. Omit for emoji icons.",
        ),
        type: fields.type.describe(
          "Whether the Category labels income or expense Transactions.",
        ),
      },
    },
    async ({ name, icon, iconKind, iconColor, type }) =>
      runTool(context, "write", async () => {
        const category = await createWalletCategory(context, {
          name,
          icon,
          iconKind: iconKind ?? "emoji",
          iconColor: iconColor ?? null,
          type,
        });

        return {
          id: category.id,
          name: category.name,
          icon: category.icon,
          iconKind: category.iconKind,
          iconColor: category.iconColor,
          type: category.type,
        };
      }),
  );

  server.registerTool(
    "update_category",
    {
      title: "Update category",
      description:
        "Rename a Category in the Wallet or change its icon. Transactions and Budgets that used the old name move with it.",
      inputSchema: {
        originalName: categoryLookupNameSchema.describe(
          "Current name of the Category. Use list_categories to see them.",
        ),
        name: fields.name.describe(
          "New name for the Category, 3 to 20 characters.",
        ),
        icon: fields.icon.describe(
          "New icon for the Category: an emoji glyph, or a Lucide icon name from the curated set when iconKind is lucide.",
        ),
        iconKind: fields.iconKind.describe(
          "Icon kind. Defaults to emoji. Use lucide for a curated Lucide icon.",
        ),
        iconColor: fields.iconColor.describe(
          "Hex color for a Lucide icon, such as #3b82f6. Omit for emoji icons.",
        ),
        type: fields.type.describe(
          "Whether the Category labels income or expense Transactions.",
        ),
      },
    },
    async ({ originalName, name, icon, iconKind, iconColor, type }) =>
      runTool(context, "write", async () => {
        const category = await updateWalletCategory(context, {
          originalName,
          name,
          icon,
          iconKind: iconKind ?? "emoji",
          iconColor: iconColor ?? null,
          type,
        });

        return {
          id: category.id,
          name: category.name,
          icon: category.icon,
          iconKind: category.iconKind,
          iconColor: category.iconColor,
          type: category.type,
        };
      }),
  );

  server.registerTool(
    "delete_category",
    {
      title: "Delete category",
      description:
        "Delete a Category from the Wallet. Use list_categories to find the Category's id.",
      inputSchema: {
        id: DeleteIdSchema.shape.id.describe(
          "Id of the Category to delete. Use list_categories to see them.",
        ),
      },
    },
    async ({ id }) =>
      runTool(context, "write", async () => {
        const category = await deleteWalletCategory(context, id);

        return {
          id: category.id,
          name: category.name,
          icon: category.icon,
          iconKind: category.iconKind,
          iconColor: category.iconColor,
          type: category.type,
        };
      }),
  );
}
