"use client";
import type { ReactNode } from "react";

import ConfirmDialog from "@/components/ConfirmDialog";
import { type GoalWithProgress } from "@/lib/goals";
import { queryKeys } from "@/lib/query-keys";

import { deleteGoalForm } from "../_actions/goals";

interface Props {
  trigger?: ReactNode;
  goal: GoalWithProgress;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DeleteGoalDialog = ({
  trigger,
  goal,
  open: openProp,
  onOpenChange,
}: Props) => {
  const goalIdentifier = `delete-goal-${goal.id}`;
  return (
    <ConfirmDialog
      trigger={trigger}
      open={openProp}
      onOpenChange={onOpenChange}
      title={<>Delete goal &quot;{goal.name}&quot;?</>}
      description={
        <>
          This permanently deletes the &quot;{goal.name}&quot; goal. Its
          contribution transactions stay in your ledger. This action cannot be
          undone.
        </>
      }
      confirmLabel="Delete goal"
      loadingLabel="Deleting goal…"
      successMessage="Goal deleted"
      errorMessage="Unable to delete the goal. Refresh the page and try again."
      toastId={goalIdentifier}
      input={{ id: goal.id }}
      formAction={deleteGoalForm}
      queryKeys={[queryKeys.goals]}
    />
  );
};

export default DeleteGoalDialog;
