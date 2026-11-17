import { z } from "zod";

import {
  CATEGORY_ICON_KINDS,
  isLucideIconName,
  withIconKindDefault,
} from "@/lib/category-icons";
import { freeText } from "@/schemas/text";

export const categoryNameSchema = freeText({
  min: 3,
  max: 20,
  minMessage: "Name the category in at least 3 characters",
});

export const categoryLookupNameSchema = z.string().min(1);
export const categoryIconKindSchema = z.enum(CATEGORY_ICON_KINDS);
export const categoryLucideIconSchema = z
  .string()
  .trim()
  .refine(isLucideIconName, "Pick a Lucide icon");
export const categoryIconColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Pick a hex color")
  .transform((value) => value.toLowerCase());
export const categoryIconSchema = z
  .string()
  .trim()
  .min(1, "Pick an icon")
  .max(64);
export const categoryTypeSchema = z.enum(["income", "expense"]);

const iconFields = {
  icon: categoryIconSchema,
  iconKind: categoryIconKindSchema,
  iconColor: categoryIconColorSchema.nullable(),
};

function refineIcon(
  value: {
    icon: string;
    iconKind: "emoji" | "lucide";
    iconColor?: string | null;
  },
  ctx: z.RefinementCtx,
) {
  if (value.iconKind === "lucide") {
    if (!isLucideIconName(value.icon)) {
      ctx.addIssue({
        code: "custom",
        path: ["icon"],
        message: "Pick a Lucide icon",
      });
    }
    return;
  }

  if (value.icon.length > 20) {
    ctx.addIssue({
      code: "custom",
      path: ["icon"],
      message: "Pick an icon",
    });
  }
  if (value.iconColor) {
    ctx.addIssue({
      code: "custom",
      path: ["icon"],
      message: "Emoji icons cannot have a color",
    });
  }
}

export const CreateCategorySchema = z
  .object({
    name: categoryNameSchema,
    type: categoryTypeSchema,
    ...iconFields,
  })
  .superRefine(refineIcon)
  .transform((value) => ({
    ...value,
    ...withIconKindDefault(value.icon, value.iconKind, value.iconColor),
  }));

export const UpdateCategorySchema = z
  .object({
    originalName: categoryLookupNameSchema,
    name: categoryNameSchema,
    type: categoryTypeSchema,
    ...iconFields,
  })
  .superRefine(refineIcon)
  .transform((value) => ({
    ...value,
    ...withIconKindDefault(value.icon, value.iconKind, value.iconColor),
  }));

export function categoryFields() {
  return {
    name: categoryNameSchema,
    icon: categoryIconSchema,
    iconKind: categoryIconKindSchema.optional(),
    iconColor: categoryIconColorSchema.nullish(),
    type: categoryTypeSchema,
  };
}

export type CreateCategorySchemaType = z.infer<typeof CreateCategorySchema>;

export type UpdateCategorySchemaType = z.infer<typeof UpdateCategorySchema>;
