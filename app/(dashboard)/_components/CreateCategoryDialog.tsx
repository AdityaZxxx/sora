import type { TransactionType } from "@/lib/types";
import type { Category } from "@prisma/client";
import type { ReactNode } from "react";

import CategoryFormDialog from "./CategoryFormDialog";

interface Props {
  type: TransactionType;
  successCallback: (category: Category) => void;
  trigger?: ReactNode;
}

const CreateCategoryDialog = ({ type, successCallback, trigger }: Props) => (
  <CategoryFormDialog
    type={type}
    trigger={trigger}
    successCallback={successCallback}
  />
);

export default CreateCategoryDialog;
