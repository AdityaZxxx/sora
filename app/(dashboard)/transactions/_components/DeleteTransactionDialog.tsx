"use client";
import ConfirmDialog from "@/components/ConfirmDialog";
import { queryKeys } from "@/lib/query-keys";

import { DeleteTransaction } from "../_actions/DeleteTransaction";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  transactionId: string;
}

const DeleteTransactionDialog = ({ open, setOpen, transactionId }: Props) => (
  <ConfirmDialog
    open={open}
    onOpenChange={setOpen}
    title="Delete transaction?"
    description="Deleting this transaction cannot be undone. Balanced totals, budgets, and goals recalculate immediately."
    confirmLabel="Delete transaction"
    loadingLabel="Deleting transaction…"
    successMessage="Transaction deleted"
    errorMessage="Unable to delete the transaction. Refresh the page and try again."
    toastId={transactionId}
    input={{ id: transactionId }}
    action={DeleteTransaction}
    queryKeys={[queryKeys.transactions.all]}
  />
);

export default DeleteTransactionDialog;
