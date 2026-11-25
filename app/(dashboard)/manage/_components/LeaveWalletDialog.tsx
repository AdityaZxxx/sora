"use client";
import type { ReactNode } from "react";

import { useRouter } from "next/navigation";

import ConfirmDialog from "@/components/ConfirmDialog";
import { queryKeys } from "@/lib/query-keys";

import { leaveWalletForm } from "../_actions/membership";

interface Props {
  trigger: ReactNode;
  memberCount: number;
}

const LeaveWalletDialog = ({ trigger, memberCount }: Props) => {
  const router = useRouter();
  const isOnlyMember = memberCount === 1;
  return (
    <ConfirmDialog
      trigger={trigger}
      title={isOnlyMember ? "Delete this space?" : "Leave wallet?"}
      description={
        isOnlyMember
          ? "This permanently deletes your space and everything in it: transactions, categories, budgets, goals, and invite links. This cannot be undone."
          : "You will no longer see this wallet's transactions, categories, or invite links. Your past transactions stay in the ledger, attributed to you. You can join again later with a new invite link."
      }
      confirmLabel={isOnlyMember ? "Delete this space" : "Leave wallet"}
      loadingLabel={isOnlyMember ? "Deleting…" : "Leaving wallet…"}
      successMessage={isOnlyMember ? "Space deleted" : "You left the wallet"}
      errorMessage={
        isOnlyMember
          ? "Unable to delete the space. Try again."
          : "Unable to leave the wallet. Try again."
      }
      toastId="leave-wallet"
      formAction={leaveWalletForm}
      queryKeys={[queryKeys.wallet, queryKeys.wallets, queryKeys.walletMembers]}
      onSuccess={() => router.refresh()}
    />
  );
};

export default LeaveWalletDialog;
