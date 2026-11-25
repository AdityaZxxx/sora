"use client";
import type { FormActionState } from "@/lib/form-action";
import type { GoalWithProgress } from "@/lib/goals";
import type { ReactElement, ReactNode } from "react";

import { useQueryClient } from "@tanstack/react-query";
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
import { useHydrated } from "@/hooks/use-hydrated";
import { Currencies } from "@/lib/currencies";
import { initialFormActionState } from "@/lib/form-action";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

import { createGoalForm, updateGoalForm } from "../_actions/goals";

type GoalFormValues = {
  name: string;
  target: number;
  deadline: Date | undefined;
};

const EMPTY_FORM: GoalFormValues = {
  name: "",
  target: 0,
  deadline: undefined,
};

const fromGoal = (goal: GoalWithProgress): GoalFormValues => ({
  name: goal.name,
  target: goal.target,
  deadline: goal.deadline ? new Date(goal.deadline) : undefined,
});

const COPY = {
  create: {
    title: "Add a goal",
    submit: "Add",
    error:
      "Unable to add the goal. Check the name and target amount, then try again.",
  },
  edit: {
    title: "Edit goal",
    submit: "Save",
    error:
      "Unable to update the goal. Check the name and target amount, then try again.",
  },
};

interface Props {
  trigger?: ReactNode;
  currency: string | null;
  goal?: GoalWithProgress;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const GoalFormDialog = ({
  trigger,
  currency,
  goal,
  open: openProp,
  onOpenChange,
}: Props) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const copy = goal ? COPY.edit : COPY.create;
  const hydrated = useHydrated();
  const queryClient = useQueryClient();
  const [values, setValues] = useState(() =>
    goal ? fromGoal(goal) : EMPTY_FORM,
  );
  const serverAction = goal ? updateGoalForm : createGoalForm;
  const [plainState, plainAction] = useActionState(
    serverAction,
    initialFormActionState,
  );

  const currencyOption = Currencies.find((c) => c.value === currency);
  const numberParts = new Intl.NumberFormat(currencyOption?.locale, {
    style: "decimal",
  }).formatToParts(1234.5);
  const thousandSeparator = numberParts.find((p) => p.type === "group")?.value;
  const decimalSeparator = numberParts.find((p) => p.type === "decimal")?.value;
  const deadlineValue = values.deadline?.toISOString().slice(0, 10) ?? "";

  const resetDraft = () => setValues(goal ? fromGoal(goal) : EMPTY_FORM);

  const submit = async (
    previous: FormActionState,
    formData: FormData,
  ): Promise<FormActionState> => {
    const result = await serverAction(previous, formData);
    if (result.status === "error") {
      toast.error(result.message || copy.error, { id: "goal-form" });
      return result;
    }

    toast.success(result.message, { id: "goal-form" });
    void queryClient.invalidateQueries({ queryKey: queryKeys.goals });
    if (!goal) {
      resetDraft();
    }
    setOpen(false);
    return result;
  };

  const [state, action] = useActionState(submit, initialFormActionState);

  const fields = (
    <>
      {goal ? <input type="hidden" name="id" value={goal.id} /> : null}
      <Field data-invalid={Boolean(state.fieldErrors.name)}>
        <FieldLabel htmlFor={goal ? "edit-goal-name" : "goal-name"}>
          Name
        </FieldLabel>
        <Input
          id={goal ? "edit-goal-name" : "goal-name"}
          name="name"
          value={values.name}
          onChange={(event) =>
            setValues((current) => ({ ...current, name: event.target.value }))
          }
          aria-invalid={Boolean(state.fieldErrors.name)}
          aria-describedby={
            state.fieldErrors.name ? "goal-name-error" : undefined
          }
          placeholder="e.g. Vacation, New car"
        />
        <FieldDescription className="text-xs sm:text-sm">
          What are you saving for?
        </FieldDescription>
        {state.fieldErrors.name ? (
          <FieldError id="goal-name-error">{state.fieldErrors.name}</FieldError>
        ) : null}
      </Field>

      <Field data-invalid={Boolean(state.fieldErrors.target)}>
        <FieldLabel htmlFor={goal ? "edit-goal-target" : "goal-target"}>
          Target amount
        </FieldLabel>
        <NumericFormat
          customInput={Input}
          id={goal ? "edit-goal-target" : "goal-target"}
          name="target"
          placeholder="0.00"
          value={values.target}
          onValueChange={(next) =>
            setValues((current) => ({
              ...current,
              target: next.floatValue ?? 0,
            }))
          }
          thousandSeparator={thousandSeparator}
          decimalSeparator={decimalSeparator}
          decimalScale={2}
          allowNegative={false}
          aria-invalid={Boolean(state.fieldErrors.target)}
          aria-describedby={
            state.fieldErrors.target ? "goal-target-error" : undefined
          }
        />
        <FieldDescription className="text-xs sm:text-sm">
          How much do you want to save?
        </FieldDescription>
        {state.fieldErrors.target ? (
          <FieldError id="goal-target-error">
            {state.fieldErrors.target}
          </FieldError>
        ) : null}
      </Field>

      <Field data-invalid={Boolean(state.fieldErrors.deadline)}>
        <FieldLabel htmlFor={goal ? "edit-goal-deadline" : "goal-deadline"}>
          Deadline (optional)
        </FieldLabel>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  id={goal ? "edit-goal-deadline" : "goal-deadline"}
                  aria-invalid={Boolean(state.fieldErrors.deadline)}
                  className={cn(
                    "min-w-0 flex-1 pl-3 text-left font-normal",
                    !values.deadline && "text-muted-foreground",
                  )}
                  variant="outline"
                />
              }
            >
              {values.deadline ? (
                format(values.deadline, "PPP")
              ) : (
                <span>No deadline</span>
              )}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={values.deadline}
                onSelect={(value) =>
                  setValues((current) => ({ ...current, deadline: value }))
                }
              />
            </PopoverContent>
          </Popover>
          {values.deadline ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setValues((current) => ({ ...current, deadline: undefined }))
              }
              className="shrink-0"
            >
              Clear
            </Button>
          ) : null}
        </div>
        <input type="hidden" name="deadline" value={deadlineValue} />
        <FieldDescription className="text-xs sm:text-sm">
          When do you want to reach the goal?
        </FieldDescription>
        {state.fieldErrors.deadline ? (
          <FieldError id="goal-deadline-error">
            {state.fieldErrors.deadline}
          </FieldError>
        ) : null}
      </Field>
    </>
  );

  return (
    <FormGate
      hydrated={hydrated}
      action={plainAction}
      plain={
        <>
          <h2 className="text-lg font-medium">{copy.title}</h2>
          {goal ? <input type="hidden" name="id" value={goal.id} /> : null}
          <Field>
            <FieldLabel htmlFor="plain-goal-name">Name</FieldLabel>
            <Input
              id="plain-goal-name"
              name="name"
              defaultValue={values.name}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="plain-goal-target">Target amount</FieldLabel>
            <Input
              id="plain-goal-target"
              name="target"
              type="text"
              inputMode="decimal"
              defaultValue={values.target}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="plain-goal-deadline">
              Deadline (optional)
            </FieldLabel>
            <Input
              id="plain-goal-deadline"
              name="deadline"
              type="date"
              defaultValue={deadlineValue}
            />
          </Field>
          <FormActionErrors state={plainState} />
          <FormSubmitButton className="w-auto">{copy.submit}</FormSubmitButton>
        </>
      }
    >
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) resetDraft();
          setOpen(next);
        }}
      >
        {trigger ? <DialogTrigger render={trigger as ReactElement} /> : null}
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-lg">
              {copy.title}
            </DialogTitle>
          </DialogHeader>
          <form action={action} className="space-y-4">
            {fields}
            <DialogFooter>
              <DialogClose
                render={
                  <Button type="button" variant="outline" className="w-auto" />
                }
              >
                Cancel
              </DialogClose>
              <FormSubmitButton className="w-auto">
                {copy.submit}
              </FormSubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </FormGate>
  );
};

export default GoalFormDialog;
