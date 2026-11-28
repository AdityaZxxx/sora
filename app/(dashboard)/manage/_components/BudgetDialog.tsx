"use client";
import type { FormActionState } from "@/lib/form-action";
import type { Wallet } from "@prisma/client";
import type { ReactElement, ReactNode } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useActionState, useState } from "react";
import { NumericFormat } from "react-number-format";
import { toast } from "sonner";

import { FormActionErrors } from "@/components/FormActionErrors";
import { FormGate } from "@/components/FormGate";
import { FormSubmitButton } from "@/components/FormSubmitButton";
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHydrated } from "@/hooks/use-hydrated";
import { useActiveWallet } from "@/hooks/use-wallets";
import { type BudgetWithProgress } from "@/lib/budgets";
import { Currencies } from "@/lib/currencies";
import { initialFormActionState } from "@/lib/form-action";
import { queryKeys } from "@/lib/query-keys";

import { createBudgetForm, updateBudgetForm } from "../../_actions/budgets";
import CategoryPicker from "../../_components/CategoryPicker";

interface Props {
  trigger?: ReactNode;
  wallet?: Wallet;
  budget?: BudgetWithProgress;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const BudgetDialog = ({
  trigger,
  wallet,
  budget,
  open: openProp,
  onOpenChange,
}: Props) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [category, setCategory] = useState(budget?.category ?? "");
  const [amount, setAmount] = useState(budget?.amount ?? 0);
  const [mode, setMode] = useState<"soft" | "hard">(
    budget?.mode === "hard" ? "hard" : "soft",
  );
  const hydrated = useHydrated();
  const queryClient = useQueryClient();
  const { data: wallets } = useActiveWallet();
  const walletId = wallet?.id ?? wallets?.active.id ?? "";
  const isEditing = Boolean(budget);
  const serverAction = budget ? updateBudgetForm : createBudgetForm;
  const [plainState, plainAction] = useActionState(
    serverAction,
    initialFormActionState,
  );

  const currency = Currencies.find((c) => c.value === wallet?.currency);
  const numberParts = new Intl.NumberFormat(currency?.locale, {
    style: "decimal",
  }).formatToParts(1234.5);
  const thousandSeparator = numberParts.find((p) => p.type === "group")?.value;
  const decimalSeparator = numberParts.find((p) => p.type === "decimal")?.value;

  const resetDraft = () => {
    setCategory("");
    setAmount(0);
    setMode("soft");
  };

  const submit = async (
    previous: FormActionState,
    formData: FormData,
  ): Promise<FormActionState> => {
    const result = await serverAction(previous, formData);
    if (result.status === "error") {
      toast.error(result.message, { id: "budget-dialog" });
      return result;
    }

    toast.success(result.message, { id: "budget-dialog" });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.budgets(walletId),
    });
    if (!isEditing) {
      resetDraft();
    }
    setOpen(false);
    return result;
  };

  const [state, action] = useActionState(submit, initialFormActionState);

  const hiddenFields = (
    <>
      {budget ? <input type="hidden" name="id" value={budget.id} /> : null}
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="mode" value={mode} />
    </>
  );

  return (
    <FormGate
      hydrated={hydrated}
      action={plainAction}
      plain={
        <>
          <h2 className="font-medium">
            {isEditing ? `Edit ${budget?.category} budget` : "Create a budget"}
          </h2>
          {budget ? <input type="hidden" name="id" value={budget.id} /> : null}
          <Field>
            <FieldLabel htmlFor="plain-budget-category">Category</FieldLabel>
            <Input
              id="plain-budget-category"
              name="category"
              defaultValue={category}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="plain-budget-amount">Monthly limit</FieldLabel>
            <Input
              id="plain-budget-amount"
              name="amount"
              type="text"
              inputMode="decimal"
              defaultValue={amount}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="plain-budget-mode">Mode</FieldLabel>
            <select
              id="plain-budget-mode"
              name="mode"
              defaultValue={mode}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="soft">Soft</option>
              <option value="hard">Hard</option>
            </select>
          </Field>
          <FormActionErrors state={plainState} />
          <FormSubmitButton className="w-auto">
            {isEditing ? "Save" : "Create"}
          </FormSubmitButton>
        </>
      }
    >
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger ? <DialogTrigger render={trigger as ReactElement} /> : null}
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-lg">
              {isEditing && budget
                ? `Edit ${budget.category} budget`
                : "Create a budget"}
            </DialogTitle>
          </DialogHeader>
          <form action={action} className="space-y-4">
            {hiddenFields}
            <Field data-invalid={Boolean(state.fieldErrors.category)}>
              <FieldLabel htmlFor="budget-category">Category</FieldLabel>
              <CategoryPicker
                key={open ? "open" : "closed"}
                id="budget-category"
                type="expense"
                value={category || undefined}
                onChange={setCategory}
                aria-invalid={Boolean(state.fieldErrors.category) || undefined}
                aria-describedby={
                  state.fieldErrors.category
                    ? "budget-category-error"
                    : undefined
                }
              />
              <FieldDescription className="text-xs sm:text-sm">
                The monthly limit applies to expenses in this category
              </FieldDescription>
              {state.fieldErrors.category ? (
                <FieldError id="budget-category-error">
                  {state.fieldErrors.category}
                </FieldError>
              ) : null}
            </Field>

            <Field data-invalid={Boolean(state.fieldErrors.amount)}>
              <FieldLabel htmlFor="budget-amount">Monthly limit</FieldLabel>
              <NumericFormat
                customInput={Input}
                id="budget-amount"
                name="amount"
                placeholder="0.00"
                value={amount}
                onValueChange={(next) => setAmount(next.floatValue ?? 0)}
                thousandSeparator={thousandSeparator}
                decimalSeparator={decimalSeparator}
                decimalScale={2}
                allowNegative={false}
                inputMode="decimal"
                aria-invalid={Boolean(state.fieldErrors.amount)}
              />
              <FieldDescription className="text-xs sm:text-sm">
                Monthly limit for this category
              </FieldDescription>
              {state.fieldErrors.amount ? (
                <FieldError id="budget-amount-error">
                  {state.fieldErrors.amount}
                </FieldError>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="budget-mode">Mode</FieldLabel>
              <Select
                value={mode}
                onValueChange={(value) => {
                  if (value === null) return;
                  setMode(value as "soft" | "hard");
                }}
                items={{
                  soft: "Soft (warn at 80% and 100%)",
                  hard: "Hard (block expenses over the limit)",
                }}
              >
                <SelectTrigger id="budget-mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soft">
                    Soft (warn at 80% and 100%)
                  </SelectItem>
                  <SelectItem value="hard">
                    Hard (block expenses over the limit)
                  </SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription className="text-xs sm:text-sm">
                Hard budgets reject expenses that would exceed the limit
              </FieldDescription>
            </Field>

            <DialogFooter>
              <DialogClose
                render={
                  <Button type="button" variant="outline" className="w-auto" />
                }
              >
                Cancel
              </DialogClose>
              <FormSubmitButton className="w-auto">
                {isEditing ? "Save" : "Create"}
              </FormSubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </FormGate>
  );
};

export default BudgetDialog;
