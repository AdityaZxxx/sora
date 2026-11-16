"use client";

import type { ReactNode } from "react";

import ConfirmDialog from "@/components/ConfirmDialog";

import { deleteAccount } from "../_actions/account";

interface Props {
  trigger: ReactNode;
}

const DeleteAccountDialog = ({ trigger }: Props) => (
  <ConfirmDialog
    trigger={trigger}
    title="Delete your account?"
    description="This permanently deletes your sign-in and sessions. Every household where you are the last member is deleted with all of its data. In households with other members you are removed; transactions you added are deleted with your account, while transactions added by other members stay. This action cannot be undone."
    confirmLabel="Delete account"
    loadingLabel="Deleting account…"
    successMessage="Your account was deleted"
    errorMessage="Unable to delete your account. Try again."
    toastId="delete-account"
    action={deleteAccount}
    queryKeys={[]}
  />
);

export default DeleteAccountDialog;
