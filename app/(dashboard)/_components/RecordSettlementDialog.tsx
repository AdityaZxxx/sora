"use client";
import type { ActionResult } from "@/lib/action-result";
import type { ReactElement, ReactNode } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { NumericFormat } from "react-number-format";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actionErrorMessage, unwrapAction } from "@/lib/action-client";
import { Currencies } from "@/lib/currencies";
import { hasTwoDecimals } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";

import { RecordSettlement } from "../_actions/balance";

interface Props {
  trigger: ReactNode;
  members: { userId: string; name: string }[];
  currency: string | null;
}

type SettlementBalances =
  Awaited<ReturnType<typeof RecordSettlement>> extends ActionResult<infer T>
    ? T
    : never;

const RecordSettlementDialog = ({ trigger, members, currency }: Props) => {
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState(0);

  const queryClient = useQueryClient();

  const currencyOption = Currencies.find((c) => c.value === currency);

  const numberParts = new Intl.NumberFormat(currencyOption?.locale, {
    style: "decimal",
  }).formatToParts(1234.5);
  const thousandSeparator = numberParts.find((p) => p.type === "group")?.value;
  const decimalSeparator = numberParts.find((p) => p.type === "decimal")?.value;

  const { mutate, isPending } = useMutation({
    mutationFn: async (input: Parameters<typeof RecordSettlement>[0]) => {
      return unwrapAction(await RecordSettlement(input));
    },
    onSuccess: (balances: SettlementBalances) => {
      toast.success("Settlement recorded", {
        id: "record-settlement",
      });
      queryClient.setQueryData(queryKeys.balances, balances);
      queryClient.invalidateQueries({
        queryKey: queryKeys.balances,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.transactions.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.overview.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.simplifiedDebts,
      });
      setMemberId("");
      setAmount(0);
      setOpen(false);
    },
    onError: (error) => {
      toast.error(
        actionErrorMessage(
          error,
          "Unable to record the settlement. Refresh the page and try again.",
        ),
        {
          id: "record-settlement",
        },
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) {
      toast.error("Select a member", { id: "record-settlement" });
      return;
    }
    if (!amount || amount <= 0 || !hasTwoDecimals(amount)) {
      toast.error(
        "Enter an amount greater than zero, with at most two decimals",
        {
          id: "record-settlement",
        },
      );
      return;
    }
    toast.loading("Recording settlement…", { id: "record-settlement" });
    mutate({ memberId, amount });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-lg">
            Record a settlement
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field>
            <FieldLabel htmlFor="settlement-member">Member</FieldLabel>
            <Select
              value={memberId}
              onValueChange={(value) => {
                if (value === null) return;
                setMemberId(value);
              }}
              items={Object.fromEntries(
                members.map((member) => [member.userId, member.name]),
              )}
            >
              <SelectTrigger id="settlement-member" className="w-full">
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription className="text-xs sm:text-sm">
              The member you paid. The settlement is recorded under your name.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="settlement-amount">Amount</FieldLabel>
            <NumericFormat
              customInput={Input}
              id="settlement-amount"
              placeholder="0.00"
              inputMode="decimal"
              aria-invalid={amount > 0 && !hasTwoDecimals(amount)}
              value={amount}
              onValueChange={(values) => {
                setAmount(values.floatValue ?? 0);
              }}
              thousandSeparator={thousandSeparator}
              decimalSeparator={decimalSeparator}
              decimalScale={2}
              allowNegative={false}
            />
            <FieldDescription className="text-xs sm:text-sm">
              How much you paid them
            </FieldDescription>
          </Field>

          <DialogFooter>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                />
              }
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={
                isPending ||
                !memberId ||
                !(amount > 0) ||
                !hasTwoDecimals(amount)
              }
              className="w-full sm:w-auto"
            >
              {!isPending ? "Record" : <Loader2 className="animate-spin" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RecordSettlementDialog;
