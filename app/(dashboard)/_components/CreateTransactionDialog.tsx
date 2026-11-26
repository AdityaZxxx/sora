"use client";
import type { CreateTransactionActionInput } from "../_actions/transaction";
import type { FormActionState } from "@/lib/form-action";
import type { GoalWithProgress } from "@/lib/goals";
import type { listMembers } from "@/lib/members";
import type { TransactionType } from "@/lib/types";
import type { ReactElement, ReactNode } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useActionState, useState } from "react";
import { NumericFormat } from "react-number-format";
import { toast } from "sonner";

import { FormActionErrors } from "@/components/FormActionErrors";
import { FormGate } from "@/components/FormGate";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMutationClient } from "@/hooks/mutation-client";
import { useHydrated } from "@/hooks/use-hydrated";
import { useActiveWallet } from "@/hooks/use-wallets";
import { actionErrorMessage, unwrapAction } from "@/lib/action-client";
import { useSession } from "@/lib/auth-client";
import { QUERY_STALE_TIME } from "@/lib/constants";
import { Currencies } from "@/lib/currencies";
import { fetchReadJson } from "@/lib/fetch-json";
import {
  formError,
  formSuccess,
  initialFormActionState,
} from "@/lib/form-action";
import { dateToUtcDate, getFormatterForCurrency } from "@/lib/helpers";
import { applyTransactionOptimistic, queryKeys } from "@/lib/query-keys";
import { buildShares, type SplitMode } from "@/lib/split-shares";
import { cn } from "@/lib/utils";
import { walletLabel } from "@/lib/wallet-label";

import { createTransactionForm } from "../_actions/transaction";
import CategoryPicker from "./CategoryPicker";

const OFFLINE_ERROR =
  "Unable to add the transaction. Refresh the page and try again.";

interface Props {
  trigger: ReactNode;
  type: TransactionType;
  currency: string;
  memberCount: number;
  initialValues?: {
    description?: string;
    category?: string;
    amount?: number;
    type?: TransactionType;
    date?: Date;
  };
  recurringItemId?: string;
}

type CreateTransactionFormValues = {
  description: string;
  category: string;
  amount: number;
  type: TransactionType;
  date: Date;
  goalId: string;
};

const CreateTransactionDialog = ({
  trigger,
  type,
  currency,
  memberCount,
  initialValues,
  recurringItemId,
}: Props) => {
  const [open, setOpen] = useState(false);
  const dialogType = initialValues?.type ?? type;
  const [initialDate] = useState(() => new Date());
  const hydrated = useHydrated();
  const activeWalletQuery = useActiveWallet();
  const activeWalletName = activeWalletQuery.active
    ? walletLabel(activeWalletQuery.active)
    : "this wallet";
  const queryClient = useQueryClient();
  const mutationClient = getMutationClient();
  const [plainState, plainAction] = useActionState(
    createTransactionForm,
    initialFormActionState,
  );

  const [values, setValues] = useState<CreateTransactionFormValues>({
    description: initialValues?.description ?? "",
    category: initialValues?.category ?? "",
    amount: initialValues?.amount ?? 0,
    type: dialogType,
    date: initialValues?.date ?? initialDate,
    goalId: "",
  });
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});
  const [splitPercents, setSplitPercents] = useState<Record<string, string>>(
    {},
  );

  const currencyOption = Currencies.find((c) => c.value === currency);
  const numberParts = new Intl.NumberFormat(currencyOption?.locale, {
    style: "decimal",
  }).formatToParts(1234.5);
  const thousandSeparator = numberParts.find((p) => p.type === "group")?.value;
  const decimalSeparator = numberParts.find((p) => p.type === "decimal")?.value;

  const goalsQuery = useQuery({
    queryKey: queryKeys.goals,
    queryFn: () =>
      fetchReadJson<GoalWithProgress[]>(
        "/api/goals",
        "Unable to load the goals. Refresh the page and try again.",
      ),
    staleTime: QUERY_STALE_TIME,
    refetchOnWindowFocus: true,
  });
  const goals = goalsQuery.data ?? [];

  const membersQuery = useQuery({
    queryKey: queryKeys.walletMembers,
    queryFn: () =>
      fetchReadJson<Awaited<ReturnType<typeof listMembers>>>(
        "/api/members",
        "Unable to load the members. Refresh the page and try again.",
      ),
    enabled: memberCount > 1,
    staleTime: QUERY_STALE_TIME,
    refetchOnWindowFocus: true,
  });
  const members = membersQuery.data ?? [];
  const { data: session } = useSession();

  const showSplitOptions = dialogType === "expense" && memberCount > 1;
  const sharePlan = buildShares(
    splitMode,
    splitMode === "percent" ? splitPercents : splitAmounts,
    members,
    values.amount,
  );
  const previewShares = showSplitOptions ? sharePlan.shares : [];
  const splitInvalid = showSplitOptions && !sharePlan.matchesAmount;
  const formatter = getFormatterForCurrency(currency);

  const buildInput = (): CreateTransactionActionInput => ({
    description: values.description,
    category: values.category,
    amount: values.amount,
    type: values.type,
    date: dateToUtcDate(values.date),
    goalId: values.goalId,
    shares:
      values.type !== "expense"
        ? undefined
        : buildShares(
            splitMode,
            splitMode === "percent" ? splitPercents : splitAmounts,
            members,
            values.amount,
          ).shares,
    recurringItemId,
  });

  const resetDraft = () => {
    setValues({
      description: initialValues?.description ?? "",
      category: initialValues?.category ?? "",
      amount: initialValues?.amount ?? 0,
      type: dialogType,
      date: initialValues?.date ?? initialDate,
      goalId: "",
    });
    setSplitMode("equal");
    setSplitAmounts({});
    setSplitPercents({});
  };

  const submit = async (
    previous: FormActionState,
    formData: FormData,
  ): Promise<FormActionState> => {
    const input = buildInput();
    const online = navigator.onLine;
    const context = online
      ? await applyTransactionOptimistic(queryClient, input)
      : undefined;
    let result: FormActionState;

    if (online) {
      result = await createTransactionForm(previous, formData);
    } else {
      const idempotencyKey = globalThis.crypto.randomUUID();
      try {
        const queued = await mutationClient.submit({
          kind: "create-transaction",
          url: window.location.pathname,
          payload: { ...input, idempotencyKey },
          idempotencyKey,
        });
        unwrapAction(queued);
        result = formSuccess("Transaction added");
      } catch (cause) {
        result = formError(actionErrorMessage(cause, OFFLINE_ERROR));
      }
    }

    if (result.status === "error") {
      context?.rollback();
      toast.error(result.message, { id: "create-transaction" });
      return result;
    }

    context?.invalidate();
    toast.success("Transaction added", { id: "create-transaction" });
    resetDraft();
    setOpen(false);
    return result;
  };

  const [state, action] = useActionState(submit, initialFormActionState);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (splitInvalid) {
      event.preventDefault();
    }
  };

  const hiddenFields = (
    <>
      <input type="hidden" name="category" value={values.category} />
      <input type="hidden" name="date" value={values.date.toISOString()} />
      <input type="hidden" name="type" value={values.type} />
      <input type="hidden" name="goalId" value={values.goalId} />
      <input
        type="hidden"
        name="shares"
        value={JSON.stringify(buildInput().shares ?? [])}
      />
      {recurringItemId ? (
        <input type="hidden" name="recurringItemId" value={recurringItemId} />
      ) : null}
    </>
  );

  return (
    <FormGate
      hydrated={hydrated}
      action={plainAction}
      plain={
        <>
          <h2 className="font-medium">
            Add a <span className="capitalize">{dialogType}</span> transaction
          </h2>
          <input type="hidden" name="type" value={dialogType} />
          <Field>
            <FieldLabel htmlFor="plain-transaction-description">
              Description
            </FieldLabel>
            <Input
              id="plain-transaction-description"
              name="description"
              defaultValue={values.description}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="plain-transaction-amount">Amount</FieldLabel>
            <Input
              id="plain-transaction-amount"
              name="amount"
              type="text"
              inputMode="decimal"
              defaultValue={values.amount}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="plain-transaction-category">
              Category
            </FieldLabel>
            <Input
              id="plain-transaction-category"
              name="category"
              defaultValue={values.category}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="plain-transaction-date">Date</FieldLabel>
            <Input
              id="plain-transaction-date"
              name="date"
              type="date"
              defaultValue={initialDate.toISOString().slice(0, 10)}
            />
          </Field>
          <FormActionErrors state={plainState} />
          <FormSubmitButton>Add</FormSubmitButton>
        </>
      }
    >
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={trigger as ReactElement} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-xl">
              Add a{" "}
              <span
                className={cn(
                  "m-1",
                  dialogType === "income"
                    ? "text-income-foreground"
                    : "text-expense-foreground",
                )}
              >
                {dialogType}
              </span>
              transaction
            </DialogTitle>
          </DialogHeader>
          <form action={action} className="space-y-4" onSubmit={handleSubmit}>
            {hiddenFields}
            <Field data-invalid={Boolean(state.fieldErrors.description)}>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Input
                id="description"
                name="description"
                value={values.description}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                aria-invalid={Boolean(state.fieldErrors.description)}
                placeholder="e.g. Groceries, Salary"
              />
              <FieldDescription className="text-xs sm:text-sm">
                Transaction description (optional)
              </FieldDescription>
              {state.fieldErrors.description ? (
                <FieldError id="description-error">
                  {state.fieldErrors.description}
                </FieldError>
              ) : null}
            </Field>

            <Field data-invalid={Boolean(state.fieldErrors.amount)}>
              <FieldLabel htmlFor="amount">Amount</FieldLabel>
              <NumericFormat
                customInput={Input}
                id="amount"
                name="amount"
                placeholder="0.00"
                value={values.amount}
                onValueChange={(next) =>
                  setValues((current) => ({
                    ...current,
                    amount: next.floatValue ?? 0,
                  }))
                }
                thousandSeparator={thousandSeparator}
                decimalSeparator={decimalSeparator}
                decimalScale={2}
                allowNegative={false}
                aria-invalid={Boolean(state.fieldErrors.amount)}
              />
              <FieldDescription className="text-xs sm:text-sm">
                Transaction amount (required)
              </FieldDescription>
              {state.fieldErrors.amount ? (
                <FieldError id="amount-error">
                  {state.fieldErrors.amount}
                </FieldError>
              ) : null}
            </Field>

            <div className="flex flex-col gap-4">
              <Field data-invalid={Boolean(state.fieldErrors.category)}>
                <FieldLabel htmlFor="category">Category</FieldLabel>
                <CategoryPicker
                  id="category"
                  type={dialogType}
                  value={values.category || undefined}
                  onChange={(value) =>
                    setValues((current) => ({ ...current, category: value }))
                  }
                  aria-invalid={Boolean(state.fieldErrors.category)}
                />
                <FieldDescription className="text-xs sm:text-sm">
                  Categories in {activeWalletName}. Only owners and co-owners
                  can rename or delete a category.
                </FieldDescription>
                {state.fieldErrors.category ? (
                  <FieldError id="category-error">
                    {state.fieldErrors.category}
                  </FieldError>
                ) : null}
              </Field>

              <Field data-invalid={Boolean(state.fieldErrors.date)}>
                <FieldLabel htmlFor="date">Date</FieldLabel>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        id="date"
                        aria-invalid={Boolean(state.fieldErrors.date)}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !values.date && "text-muted-foreground",
                        )}
                        variant={"outline"}
                      />
                    }
                  >
                    {values.date ? (
                      format(values.date, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={values.date}
                      onSelect={(value) => {
                        if (!value) return;
                        setValues((current) => ({ ...current, date: value }));
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <FieldDescription className="text-xs sm:text-sm">
                  Transaction date
                </FieldDescription>
                {state.fieldErrors.date ? (
                  <FieldError id="date-error">
                    {state.fieldErrors.date}
                  </FieldError>
                ) : null}
              </Field>
            </div>

            {dialogType === "expense" && goals.length > 0 ? (
              <Field>
                <FieldLabel htmlFor="goalId">Goal (optional)</FieldLabel>
                <Select
                  value={values.goalId || "none"}
                  onValueChange={(value) => {
                    if (value === null) return;
                    setValues((current) => ({
                      ...current,
                      goalId: value === "none" ? "" : value,
                    }));
                  }}
                  items={{
                    none: "No goal",
                    ...Object.fromEntries(
                      goals.map((goal) => [goal.id, goal.name]),
                    ),
                  }}
                >
                  <SelectTrigger id="goalId" className="w-full">
                    <SelectValue placeholder="No goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No goal</SelectItem>
                    {goals.map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription className="text-xs sm:text-sm">
                  Tag this expense as a contribution to a goal
                </FieldDescription>
              </Field>
            ) : null}

            {showSplitOptions && members.length > 0 ? (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">Split</p>
                  <Select
                    value={splitMode}
                    onValueChange={(value) => {
                      if (value === null) return;
                      setSplitMode(value as SplitMode);
                    }}
                    items={{
                      equal: "Equally",
                      amounts: "By amount",
                      percent: "By percent",
                    }}
                  >
                    <SelectTrigger
                      className="w-44"
                      aria-label="How this expense is split"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equal">Equally</SelectItem>
                      <SelectItem value="amounts">By amount</SelectItem>
                      <SelectItem value="percent">By percent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {splitMode !== "equal" ? (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.user.id}
                        className="flex items-center gap-2"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {member.user.name}
                          {member.user.id === session?.user.id ? " (you)" : ""}
                        </span>
                        <NumericFormat
                          customInput={Input}
                          className="w-28"
                          value={
                            (splitMode === "percent"
                              ? splitPercents[member.user.id]
                              : splitAmounts[member.user.id]) ?? ""
                          }
                          onValueChange={(next) => {
                            const raw = next.value ?? "";
                            if (splitMode === "percent") {
                              setSplitPercents((current) => ({
                                ...current,
                                [member.user.id]: raw,
                              }));
                            } else {
                              setSplitAmounts((current) => ({
                                ...current,
                                [member.user.id]: raw,
                              }));
                            }
                          }}
                          thousandSeparator={thousandSeparator}
                          decimalSeparator={decimalSeparator}
                          decimalScale={splitMode === "percent" ? 1 : 2}
                          suffix={splitMode === "percent" ? "%" : undefined}
                          allowNegative={false}
                          aria-label={`Share for ${member.user.name}`}
                        />
                      </div>
                    ))}
                    <p
                      className={cn(
                        "text-xs",
                        splitInvalid
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      Assigned{" "}
                      {formatter.format(
                        previewShares?.reduce(
                          (sum, share) => sum + share.amount,
                          0,
                        ) ?? 0,
                      )}{" "}
                      of {formatter.format(values.amount)}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <DialogFooter>
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="w-auto"
                    onClick={resetDraft}
                  />
                }
              >
                Cancel
              </DialogClose>
              <FormSubmitButton
                className="w-auto"
                disabled={splitInvalid}
                pendingLabel="Adding transaction…"
              >
                Add
              </FormSubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </FormGate>
  );
};

export default CreateTransactionDialog;
