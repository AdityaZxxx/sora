"use client";
import type { Category } from "@prisma/client";
import type { ReactNode } from "react";

import ConfirmDialog from "@/components/ConfirmDialog";
import { useActiveWallet } from "@/hooks/use-wallets";
import { queryKeys } from "@/lib/query-keys";

import { deleteCategoryForm } from "../_actions/categories";

interface Props {
  trigger?: ReactNode;
  category: Category;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DeleteCategoryDialog = ({
  trigger,
  category,
  open,
  onOpenChange,
}: Props) => {
  const { data: wallets } = useActiveWallet();
  const walletId = wallets?.active.id ?? "";
  return (
    <ConfirmDialog
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      title={<>Delete category &quot;{category.name}&quot;?</>}
      description={
        <>
          This permanently deletes the &quot;{category.name}&quot;{" "}
          {category.type} category. This action cannot be undone.
        </>
      }
      confirmLabel="Delete category"
      loadingLabel="Deleting category…"
      successMessage="Category deleted"
      errorMessage="Unable to delete the category. Refresh the page and try again."
      toastId={`${category.name}-${category.type}`}
      input={{ id: category.id }}
      formAction={deleteCategoryForm}
      queryKeys={[queryKeys.categories(walletId)]}
    />
  );
};

export default DeleteCategoryDialog;
