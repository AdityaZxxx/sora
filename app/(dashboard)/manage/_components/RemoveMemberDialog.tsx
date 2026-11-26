"use client";
import type { listMembers } from "@/lib/members";
import type { ReactNode } from "react";

import ConfirmDialog from "@/components/ConfirmDialog";
import { queryKeys } from "@/lib/query-keys";

import { removeMemberForm } from "../_actions/membership";

type Member = Awaited<ReturnType<typeof listMembers>>[number];

interface Props {
  trigger: ReactNode;
  member: Member;
}

const RemoveMemberDialog = ({ trigger, member }: Props) => (
  <ConfirmDialog
    trigger={trigger}
    title={<>Remove {member.user.name} from the wallet?</>}
    description="They will lose access to this wallet's transactions, categories, and invite links. Their past transactions stay in the ledger, attributed to them."
    confirmLabel="Remove member"
    loadingLabel="Removing member…"
    successMessage={`${member.user.name} removed from the wallet`}
    errorMessage="Unable to remove this member. Try again."
    toastId={`remove-member-${member.userId}`}
    input={{ userId: member.userId }}
    formAction={removeMemberForm}
    queryKeys={[queryKeys.walletMembers]}
  />
);

export default RemoveMemberDialog;
