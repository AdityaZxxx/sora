"use client";

import type { ActionResult } from "@/lib/action-result";

import { Loader2, Users } from "lucide-react";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { joinWalletByToken } from "../_actions/invite";

interface Props {
  token: string;
  walletName: string | null;
  inviterName: string | null;
}

const initialState: ActionResult = { ok: true };

function JoinButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full gap-2" type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Users className="h-4 w-4" />
      )}
      Join wallet
    </Button>
  );
}

const JoinWalletCard = ({ token, walletName, inviterName }: Props) => {
  const [state, formAction] = useActionState(
    joinWalletByToken.bind(null, token),
    initialState,
  );

  useEffect(() => {
    if (!state.ok) {
      toast.error(state.message, { id: "join-wallet" });
    }
  }, [state]);

  return (
    <Card className="mt-12 w-[min(400px,calc(100vw-2rem))]">
      <CardHeader>
        <CardTitle className="text-xl">
          Join {walletName ?? "this wallet"}
        </CardTitle>
        <CardDescription>
          {inviterName
            ? `${inviterName} invited you to share this wallet's ledger: transactions, budgets, and goals.`
            : "You have been invited to share this wallet's ledger: transactions, budgets, and goals."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <JoinButton />
        </form>
      </CardContent>
    </Card>
  );
};

export default JoinWalletCard;
