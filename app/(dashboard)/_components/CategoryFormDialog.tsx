import type { TransactionType } from "@/lib/types";
import type { Category } from "@prisma/client";
import type { ReactElement, ReactNode } from "react";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import CategoryIcon from "@/components/CategoryIcon";
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
import { actionErrorMessage, unwrapAction } from "@/lib/action-client";
import { defaultCategoryIcon, withIconKindDefault } from "@/lib/category-icons";
import { cn } from "@/lib/utils";
import { CreateCategorySchema } from "@/schemas/categories";

import { CreateCategory, UpdateCategory } from "../_actions/categories";
import CategoryIconPicker from "./CategoryIconPicker";

const COPY = {
  create: {
    verb: "Add",
    submit: "Add",
    toastId: "create-category",
    loading: "Adding category…",
    success: (name: string) => `Category "${name}" added`,
    error: "Unable to create the category. Refresh the page and try again.",
  },
  edit: {
    verb: "Edit",
    submit: "Save",
    toastId: "update-category",
    loading: "Updating category…",
    success: (name: string) => `Category "${name}" updated`,
    error: "Unable to update the category. Refresh the page and try again.",
  },
};

interface Props {
  type: TransactionType;
  category?: Category;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  successCallback?: (category: Category) => void;
}

const CategoryFormDialog = ({
  type,
  category,
  trigger,
  open: openProp,
  onOpenChange,
  successCallback,
}: Props) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const isEditing = Boolean(category);
  const copy = isEditing ? COPY.edit : COPY.create;
  const idPrefix = isEditing ? "edit-" : "";

  const defaultValues = () => ({
    name: category?.name ?? "",
    ...(category
      ? withIconKindDefault(
          category.icon,
          category.iconKind,
          category.iconColor,
        )
      : defaultCategoryIcon()),
    type: (category?.type as TransactionType) ?? type,
  });

  const [iconState, setIconState] = useState(() => {
    const values = defaultValues();
    return {
      icon: values.icon,
      iconKind: values.iconKind,
      iconColor: values.iconColor,
    };
  });

  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: ReturnType<typeof defaultValues>) => {
      const saved = category
        ? await UpdateCategory({
            originalName: category.name,
            name: values.name,
            icon: values.icon,
            iconKind: values.iconKind,
            iconColor: values.iconColor,
            type: values.type,
          })
        : await CreateCategory(values);
      const savedCategory = unwrapAction(saved);
      if (!savedCategory) {
        throw new Error(copy.error);
      }
      return savedCategory;
    },
    onSuccess: async (savedCategory) => {
      const values = defaultValues();
      form.reset(values);
      setIconState({
        icon: values.icon,
        iconKind: values.iconKind,
        iconColor: values.iconColor,
      });
      toast.success(copy.success(savedCategory.name), { id: copy.toastId });

      successCallback?.(savedCategory);

      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      if (isEditing) {
        await queryClient.invalidateQueries({ queryKey: ["budgets"] });
      }

      setOpen(false);
    },
    onError: (error) => {
      toast.error(actionErrorMessage(error, copy.error), {
        id: copy.toastId,
      });
    },
  });

  const form = useForm({
    defaultValues: defaultValues(),
    validators: {
      onSubmit: CreateCategorySchema,
    },
    onSubmitInvalid: () => {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    },
    onSubmit: ({ value }) => {
      toast.loading(copy.loading, { id: copy.toastId });
      mutate(value);
    },
  });

  const resetDraft = () => {
    const values = defaultValues();
    form.reset(values);
    setIconState({
      icon: values.icon,
      iconKind: values.iconKind,
      iconColor: values.iconColor,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetDraft();
        setOpen(nextOpen);
      }}
    >
      {trigger ? <DialogTrigger render={trigger as ReactElement} /> : null}
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
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field name="name">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={`${idPrefix}${field.name}`}>
                    Name
                  </FieldLabel>
                  <Input
                    id={`${idPrefix}${field.name}`}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    aria-describedby={
                      isInvalid ? `${field.name}-error` : undefined
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
                  {isInvalid && (
                    <FieldError
                      id={`${field.name}-error`}
                      errors={field.state.meta.errors}
                    />
                  )}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="icon">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={`${idPrefix}${field.name}`}>
                    Icon
                  </FieldLabel>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          id={`${idPrefix}${field.name}`}
                          aria-invalid={isInvalid}
                          aria-describedby={
                            isInvalid ? `${field.name}-error` : undefined
                          }
                          variant={"outline"}
                          className="h-[100px] w-full"
                        />
                      }
                    >
                      {iconState.icon ? (
                        <div className="flex flex-col items-center gap-2">
                          <CategoryIcon
                            icon={iconState.icon}
                            iconKind={iconState.iconKind}
                            iconColor={iconState.iconColor}
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
                        icon={iconState.icon}
                        iconKind={iconState.iconKind}
                        iconColor={iconState.iconColor}
                        onChange={(next) => {
                          setIconState(next);
                          form.setFieldValue("icon", next.icon);
                          form.setFieldValue("iconKind", next.iconKind);
                          form.setFieldValue("iconColor", next.iconColor);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {isInvalid && (
                    <FieldError
                      id={`${field.name}-error`}
                      errors={field.state.meta.errors}
                    />
                  )}
                </Field>
              );
            }}
          </form.Field>
          <DialogFooter>
            <DialogClose
              render={<Button variant={"secondary"} type="button" />}
            >
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {!isPending && copy.submit}
              {isPending && <Loader2 className="animate-spin" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryFormDialog;
