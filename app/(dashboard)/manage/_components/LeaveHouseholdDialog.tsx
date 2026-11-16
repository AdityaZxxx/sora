"use client";

import type { ReactNode } from "react";

import ConfirmDialog from "@/components/ConfirmDialog";

import { leaveHousehold } from "../_actions/membership";

interface Props {
  trigger: ReactNode;
  memberCount: number;
}

const LeaveHouseholdDialog = ({ trigger, memberCount }: Props) => {
  const isOnlyMember = memberCount === 1;
  return (
    <ConfirmDialog
      trigger={trigger}
      title={isOnlyMember ? "Delete this space?" : "Leave household?"}
      description={
        isOnlyMember
          ? "This permanently deletes your space and everything in it: transactions, categories, budgets, goals, and invite links. This cannot be undone."
          : "You will no longer see this household's transactions, categories, or invite links. Your past transactions stay in the ledger, attributed to you. You can join again later with a new invite link."
      }
      confirmLabel={isOnlyMember ? "Delete this space" : "Leave household"}
      loadingLabel={isOnlyMember ? "Deleting…" : "Leaving household…"}
      successMessage={isOnlyMember ? "Space deleted" : "You left the household"}
      errorMessage={
        isOnlyMember
          ? "Unable to delete the space. Try again."
          : "Unable to leave the household. Try again."
      }
      toastId="leave-household"
      action={leaveHousehold}
      queryKeys={[["household"], ["householdMembers"]]}
    />
  );
};

export default LeaveHouseholdDialog;
