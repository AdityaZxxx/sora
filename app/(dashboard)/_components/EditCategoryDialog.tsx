"use client";

import type { Category } from "@prisma/client";
import type { ReactNode } from "react";

import CategoryFormDialog from "./CategoryFormDialog";

interface Props {
  category: Category;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const EditCategoryDialog = ({
  category,
  trigger,
  open,
  onOpenChange,
}: Props) => (
  <CategoryFormDialog
    category={category}
    type={category.type as "income" | "expense"}
    trigger={trigger}
    open={open}
    onOpenChange={onOpenChange}
  />
);

export default EditCategoryDialog;
