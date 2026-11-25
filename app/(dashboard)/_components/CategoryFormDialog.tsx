"use client";
import type { FormActionState } from "@/lib/form-action";
import type { TransactionType } from "@/lib/types";
import type { Category } from "@prisma/client";
import type { ReactElement, ReactNode } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { CircleOff, PlusSquare } from "lucide-react";
import { useActionState, useState } from "react";
import { toast } from "sonner";

import CategoryIcon from "@/components/CategoryIcon";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useHydrated } from "@/hooks/use-hydrated";
import { defaultCategoryIcon, withIconKindDefault } from "@/lib/category-icons";
import { initialFormActionState } from "@/lib/form-action";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

import { createCategoryForm, updateCategoryForm } from "../_actions/categories";
import CategoryIconPicker from "./CategoryIconPicker";

const COPY = {
  create: {
    verb: "Add",
    submit: "Add",
    success: (name: string) => `Category "${name}" added`,
    error:
      "Unable to create the category. Check the name and icon, then try again.",
  },
  edit: {
    verb: "Edit",
    submit: "Save",
    success: (name: string) => `Category "${name}" updated`,
    error:
      "Unable to update the category. Check the name and icon, then try again.",
  },
};

interface Props {
  type: TransactionType;
  category?: Category;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  successCallback?: (category: Category) => void;
  defaultName?: string;
}

type CategoryValues = {
  name: string;
  icon: string;
  iconKind: "emoji" | "lucide";
  iconColor: string | null;
  type: TransactionType;
};

function isSavedCategory(data: unknown): data is Category {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "name" in data &&
    "type" in data
  );
}

const CategoryFormDialog = ({
  type,
  category,
  trigger,
  open: openProp,
  onOpenChange,
  successCallback,
  defaultName,
}: Props) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const isEditing = Boolean(category);
  const copy = isEditing ? COPY.edit : COPY.create;
  const idPrefix = isEditing ? "edit-" : "";
  const hydrated = useHydrated();
  const queryClient = useQueryClient();

  const defaultValues = (): CategoryValues => ({
    name: category?.name ?? defaultName ?? "",
    ...(category
      ? withIconKindDefault(
          category.icon,
          category.iconKind,
          category.iconColor,
        )
      : defaultCategoryIcon()),
    type: (category?.type as TransactionType) ?? type,
  });

  const [values, setValues] = useState(defaultValues);
  const serverAction = category ? updateCategoryForm : createCategoryForm;
  const [plainState, plainAction] = useActionState(
    serverAction,
    initialFormActionState,
  );

  const resetDraft = () => setValues(defaultValues());

  const submit = async (
    previous: FormActionState,
    formData: FormData,
  ): Promise<FormActionState> => {
    const result = await serverAction(previous, formData);
    if (result.status === "error") {
      toast.error(result.message || copy.error, { id: "category-form" });
      return result;
    }

    const name = isSavedCategory(result.data) ? result.data.name : values.name;
    toast.success(copy.success(name), { id: "category-form" });
    if (isSavedCategory(result.data)) {
      successCallback?.(result.data);
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.categories() });
    if (isEditing) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgets });
    }
    if (!isEditing) {
      resetDraft();
    }
    setOpen(false);
    return result;
  };

  const [state, action] = useActionState(submit, initialFormActionState);

  const hiddenFields = (
    <>
      {category ? (
        <input type="hidden" name="originalName" value={category.name} />
      ) : null}
      <input type="hidden" name="icon" value={values.icon} />
      <input type="hidden" name="iconKind" value={values.iconKind} />
      <input type="hidden" name="iconColor" value={values.iconColor ?? ""} />
      <input type="hidden" name="type" value={values.type} />
    </>
  );

  return (
    <FormGate
      hydrated={hydrated}
      action={plainAction}
      plain={
        <>
          <h2 className="font-medium">
            {copy.verb} <span className="capitalize">{type}</span> category
          </h2>
          {hiddenFields}
          <Field>
            <FieldLabel htmlFor="plain-category-name">Name</FieldLabel>
            <Input
              id="plain-category-name"
              name="name"
              defaultValue={values.name}
              minLength={3}
              maxLength={20}
            />
          </Field>
          <FormActionErrors state={plainState} />
          <FormSubmitButton>{copy.submit}</FormSubmitButton>
        </>
      }
    >
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) resetDraft();
          setOpen(nextOpen);
        }}
      >
        {trigger ? (
          <DialogTrigger render={trigger as ReactElement} />
        ) : !isEditing && openProp === undefined ? (
          <DialogTrigger
            render={
              <Button
                variant={"ghost"}
                className="flex border-separate items-center justify-start rounded-none border-b px-3 py-3 text-muted-foreground"
              >
                <PlusSquare className="mr-2 h-4 w-4" />
                Add new
              </Button>
            }
          />
        ) : null}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {copy.verb}{" "}
              <span
                className={cn(
                  "m-1",
                  type === "income"
                    ? "text-income-foreground"
                    : "text-expense-foreground",
                )}
              >
                {type}
              </span>
              category
            </DialogTitle>
          </DialogHeader>
          <form action={action} className="space-y-4">
            {hiddenFields}
            <Field data-invalid={Boolean(state.fieldErrors.name)}>
              <FieldLabel htmlFor={`${idPrefix}name`}>Name</FieldLabel>
              <Input
                id={`${idPrefix}name`}
                name="name"
                value={values.name}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                aria-invalid={Boolean(state.fieldErrors.name)}
                aria-describedby={
                  state.fieldErrors.name ? `${idPrefix}name-error` : undefined
                }
                placeholder="Category name"
                minLength={3}
                maxLength={20}
              />
              <FieldDescription>
                {isEditing
                  ? "Transactions and budgets using this category are updated too."
                  : "This is how your category will appear in the app."}
              </FieldDescription>
              {state.fieldErrors.name ? (
                <FieldError id={`${idPrefix}name-error`}>
                  {state.fieldErrors.name}
                </FieldError>
              ) : null}
            </Field>

            <Field data-invalid={Boolean(state.fieldErrors.icon)}>
              <FieldLabel htmlFor={`${idPrefix}icon`}>Icon</FieldLabel>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      id={`${idPrefix}icon`}
                      aria-invalid={Boolean(state.fieldErrors.icon)}
                      aria-describedby={
                        state.fieldErrors.icon
                          ? `${idPrefix}icon-error`
                          : undefined
                      }
                      variant={"outline"}
                      className="h-[100px] w-full"
                    />
                  }
                >
                  {values.icon ? (
                    <div className="flex flex-col items-center gap-2">
                      <CategoryIcon
                        icon={values.icon}
                        iconKind={values.iconKind}
                        iconColor={values.iconColor}
                        className="size-10 text-3xl"
                      />
                      <p className="text-xs text-muted-foreground">
                        Click to change
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <CircleOff className="h-[40px] w-[40px]" />
                      <p className="text-xs text-muted-foreground">
                        Click to select
                      </p>
                    </div>
                  )}
                </PopoverTrigger>
                <PopoverContent className="w-[22rem]">
                  <CategoryIconPicker
                    icon={values.icon}
                    iconKind={values.iconKind}
                    iconColor={values.iconColor}
                    onChange={(next) =>
                      setValues((current) => ({ ...current, ...next }))
                    }
                  />
                </PopoverContent>
              </Popover>
              {state.fieldErrors.icon ? (
                <FieldError id={`${idPrefix}icon-error`}>
                  {state.fieldErrors.icon}
                </FieldError>
              ) : null}
            </Field>
            <DialogFooter>
              <DialogClose
                render={<Button variant={"secondary"} type="button" />}
              >
                Cancel
              </DialogClose>
              <FormSubmitButton>{copy.submit}</FormSubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </FormGate>
  );
};

export default CategoryFormDialog;
