"use client";

import type { TransactionType } from "@/lib/types";
import type { Category } from "@prisma/client";
import type { ReactNode } from "react";

import CategoryFormDialog from "./CategoryFormDialog";

interface Props {
  type: TransactionType;
  successCallback: (category: Category) => void;
  trigger?: ReactNode;
  defaultName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CreateCategoryDialog = ({
  type,
  successCallback,
  trigger,
  defaultName,
  open,
  onOpenChange,
}: Props) => (
  <CategoryFormDialog
    type={type}
    trigger={trigger}
    successCallback={successCallback}
    defaultName={defaultName}
    open={open}
    onOpenChange={onOpenChange}
  />
);

export default CreateCategoryDialog;
