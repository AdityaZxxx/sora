"use client";

import type { ReactNode } from "react";

import { useRouter } from "next/navigation";

import ConfirmDialog from "@/components/ConfirmDialog";

import { deleteAccountForm } from "../_actions/account";

interface Props {
  trigger: ReactNode;
}

const DeleteAccountDialog = ({ trigger }: Props) => {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={trigger}
      title="Delete your account?"
      description="This permanently deletes your sign-in and sessions. Every wallet where you are the last member is deleted with all of its data. In wallets with other members you are removed; transactions you added are deleted with your account, while transactions added by other members stay. This action cannot be undone."
      confirmLabel="Delete account"
      loadingLabel="Deleting account…"
      successMessage="Your account was deleted"
      errorMessage="Unable to delete your account. Try again."
      toastId="delete-account"
      formAction={deleteAccountForm}
      queryKeys={[]}
      onSuccess={() => {
        router.replace("/sign-in");
        router.refresh();
      }}
    />
  );
};

export default DeleteAccountDialog;
