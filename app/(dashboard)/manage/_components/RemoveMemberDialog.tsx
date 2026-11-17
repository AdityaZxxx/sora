"use client";

import type { listMembers } from "../_actions/membership";
import type { ReactNode } from "react";

import ConfirmDialog from "@/components/ConfirmDialog";

import { removeMember } from "../_actions/membership";

type Member = NonNullable<
  Extract<Awaited<ReturnType<typeof listMembers>>, { ok: true }>["data"]
>[number];

interface Props {
  trigger: ReactNode;
  member: Member;
}

const RemoveMemberDialog = ({ trigger, member }: Props) => (
  <ConfirmDialog
    trigger={trigger}
    title={<>Remove {member.user.name} from the household?</>}
    description="They will lose access to this household's transactions, categories, and invite links. Their past transactions stay in the ledger, attributed to them."
    confirmLabel="Remove member"
    loadingLabel="Removing member…"
    successMessage={`${member.user.name} removed from the household`}
    errorMessage="Unable to remove this member. Try again."
    toastId={`remove-member-${member.userId}`}
    input={{ userId: member.userId }}
    action={removeMember}
    queryKeys={[["householdMembers"]]}
  />
);

export default RemoveMemberDialog;
