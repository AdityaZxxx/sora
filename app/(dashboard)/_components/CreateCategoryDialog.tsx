import type { CategoryIconKind } from "@/lib/category-icons";
import type { TransactionType } from "@/lib/types";
import type { Category } from "@prisma/client";
import type { ReactElement, ReactNode } from "react";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleOff, Loader2, PlusSquare } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { CreateCategorySchema } from "@/schemas/categories";

import { CreateCategory } from "../_actions/categories";
import CategoryIconPicker from "./CategoryIconPicker";

interface Props {
  type: TransactionType;
  successCallback: (category: Category) => void;
  trigger?: ReactNode;
}

const CreateCategoryDialog = ({ type, successCallback, trigger }: Props) => {
  const [open, setOpen] = useState(false);
  const [iconState, setIconState] = useState(() => ({
    icon: "",
    iconKind: "emoji" as CategoryIconKind,
    iconColor: null as string | null,
  }));
  const getDefaultValues = () => ({
    name: "",
    icon: "",
    iconKind: "emoji" as CategoryIconKind,
    iconColor: null as string | null,
    type,
  });

  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (input: Parameters<typeof CreateCategory>[0]) => {
      const category = unwrapAction(await CreateCategory(input));
      if (!category) {
        throw new Error(
          "Unable to create the category. Refresh the page and try again.",
        );
      }
      return category;
    },
    onSuccess: async (category) => {
      form.reset(getDefaultValues());
      setIconState({ icon: "", iconKind: "emoji", iconColor: null });
      toast.success(`Category "${category.name}" added`, {
        id: "create-category",
      });

      successCallback(category);

      await queryClient.invalidateQueries({
        queryKey: ["categories"],
      });

      setOpen(false);
    },
    onError: (error) => {
      toast.error(
        actionErrorMessage(
          error,
          "Unable to create the category. Refresh the page and try again.",
        ),
        {
          id: "create-category",
        },
      );
    },
  });

  const form = useForm({
    defaultValues: getDefaultValues(),
    validators: {
      onSubmit: CreateCategorySchema,
    },
    onSubmitInvalid: () => {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    },
    onSubmit: ({ value }) => {
      toast.loading("Adding category…", {
        id: "create-category",
      });
      mutate(value);
    },
  });

  const resetDraft = () => {
    form.reset(getDefaultValues());
    setIconState({ icon: "", iconKind: "emoji", iconColor: null });
  };

  const triggerElement = (trigger ?? (
    <Button
      variant={"ghost"}
      className="flex border-separate items-center justify-start rounded-none border-b px-3 py-3 text-muted-foreground"
    >
      <PlusSquare className="mr-2 h-4 w-4" />
      Add new
    </Button>
  )) as ReactElement;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetDraft();
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger render={triggerElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Add{" "}
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
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    id={field.name}
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
                    This is how your category will appear in the app.
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
                  <FieldLabel htmlFor={field.name}>Icon</FieldLabel>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          id={field.name}
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
              {!isPending && "Add"}
              {isPending && <Loader2 className="animate-spin" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCategoryDialog;
