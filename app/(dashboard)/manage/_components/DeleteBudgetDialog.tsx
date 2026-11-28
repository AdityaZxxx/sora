"use client";
import type { ReactNode } from "react";

import ConfirmDialog from "@/components/ConfirmDialog";
import { useActiveWallet } from "@/hooks/use-wallets";
import { type BudgetWithProgress } from "@/lib/budgets";
import { queryKeys } from "@/lib/query-keys";

import { deleteBudgetForm } from "../../_actions/budgets";

interface Props {
  trigger?: ReactNode;
  budget: BudgetWithProgress;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DeleteBudgetDialog = ({ trigger, budget, open, onOpenChange }: Props) => {
  const { data: wallets } = useActiveWallet();
  const walletId = wallets?.active.id ?? "";
  return (
    <ConfirmDialog
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      title={<>Delete budget for &quot;{budget.category}&quot;?</>}
      description={
        <>
          This permanently deletes the monthly limit for &quot;
          {budget.category}&quot;. Transactions already recorded stay in the
          ledger. This action cannot be undone.
        </>
      }
      confirmLabel="Delete budget"
      loadingLabel="Deleting budget…"
      successMessage="Budget deleted"
      errorMessage="Unable to delete budget. Try again."
      toastId={`delete-budget-${budget.id}`}
      input={{ id: budget.id }}
      formAction={deleteBudgetForm}
      queryKeys={[queryKeys.budgets(walletId)]}
    />
  );
};

export default DeleteBudgetDialog;
