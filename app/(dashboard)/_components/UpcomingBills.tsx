"use client";

import type { TransactionType } from "@/lib/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Loader2,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import AddIconButton from "@/components/ui/add-icon-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EmptyState from "@/components/ui/empty-state";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { POLL_INTERVAL } from "@/lib/constants";
import { getFormatterForCurrency } from "@/lib/helpers";

import {
  DeleteRecurringItem,
  listRecurringItemsAction,
  SetRecurringItemPaused,
} from "../_actions/recurring";
import CreateTransactionDialog from "./CreateTransactionDialog";
import RecurringItemDialog, {
  type RecurringItemDraft,
} from "./RecurringItemDialog";

interface Props {
  currency: string | null;
  canEdit: boolean;
}

const utc = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

const dueLabel = (item: { isOverdue: boolean; dueDate: Date | null }) =>
  item.isOverdue && item.dueDate
    ? `Overdue since ${utc(item.dueDate)}`
    : "Due today";

const nextLabel = (item: {
  frequency: string;
  weekday: number | null;
  dayOfMonth: number | null;
}) => {
  if (item.frequency === "weekly") {
    const names = [
      "Sundays",
      "Mondays",
      "Tuesdays",
      "Wednesdays",
      "Thursdays",
      "Fridays",
      "Saturdays",
    ];
    return `Every ${names[item.weekday ?? 0]}`;
  }
  return `Day ${item.dayOfMonth} of the month`;
};

const UpcomingBills = ({ currency, canEdit }: Props) => {
  const queryClient = useQueryClient();
  const formatter = getFormatterForCurrency(currency ?? "USD");
  const [showAll, setShowAll] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RecurringItemDraft | null>(
    null,
  );
  const [editItem, setEditItem] = useState<RecurringItemDraft | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["recurringItems"],
    queryFn: async () => {
      const res = await listRecurringItemsAction();
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const pauseMutation = useMutation({
    mutationFn: async (input: { id: string; paused: boolean }) => {
      const res = await SetRecurringItemPaused(input);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurringItems"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Unable to update the bill. Refresh the page and try again.",
        { id: "pause-recurring-item" },
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (input: { id: string }) => {
      const res = await DeleteRecurringItem(input);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Bill deleted", { id: "delete-recurring-item" });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["recurringItems"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Unable to delete the bill. Refresh the page and try again.",
        { id: "delete-recurring-item" },
      );
    },
  });

  const due = items.filter((item) => item.isDue);
  const visible = showAll ? items : due;
  const hiddenCount = items.length - due.length;

  return (
    <>
      <Card className="h-full transition-all hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg">Upcoming bills</CardTitle>
              <CardDescription>
                Recurring income and expenses, due and past due
              </CardDescription>
            </div>
            {canEdit ? (
              <RecurringItemDialog
                currency={currency}
                trigger={<AddIconButton label="Add bill" />}
              />
            ) : undefined}
          </div>
        </CardHeader>
        <CardContent>
          <SkeletonWrapper isLoading={isLoading}>
            {items.length === 0 ? (
              <CardContent>
                <EmptyState
                  icon={CalendarClock}
                  hint={
                    canEdit
                      ? "Add your first recurring bill or paycheck to get started."
                      : "No recurring bills have been added yet."
                  }
                />
              </CardContent>
            ) : visible.length === 0 ? (
              <CardContent>
                <EmptyState
                  icon={CalendarClock}
                  hint="Nothing due right now."
                />
              </CardContent>
            ) : (
              <div className="divide-y">
                {visible.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 py-2 first:pt-0 last:pb-0 sm:gap-y-2 sm:py-3"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm sm:h-9 sm:w-9 sm:text-base"
                      >
                        {item.categoryIcon}
                      </span>
                      <span className="min-w-0">
                        <span className="block max-w-32 truncate text-sm font-medium min-[380px]:max-w-44 sm:max-w-none">
                          {item.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {item.paused
                            ? "Paused"
                            : showAll && !item.isDue
                              ? nextLabel(item)
                              : dueLabel(item)}
                        </span>
                      </span>
                    </span>
                    <span className="flex w-full items-center justify-between gap-y-1 sm:ml-auto sm:w-auto sm:flex-nowrap sm:justify-end sm:gap-x-2">
                      <span
                        className={
                          item.type === "income"
                            ? "text-sm font-medium text-income-foreground tabular-nums"
                            : "text-sm font-medium text-expense-foreground tabular-nums"
                        }
                      >
                        {formatter.format(item.amount)}
                      </span>
                      {canEdit && (
                        <span className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                          <CreateTransactionDialog
                            key={item.id}
                            type={item.type as TransactionType}
                            recurringItemId={item.id}
                            initialValues={{
                              description: item.name,
                              category: item.category,
                              amount: item.amount,
                              type: item.type as TransactionType,
                              shared: true,
                            }}
                            trigger={
                              <Button size="sm" variant="secondary">
                                Post
                              </Button>
                            }
                          />
                          <UpcomingBillActions
                            item={item}
                            onEdit={() => setEditItem(item)}
                            onPause={() =>
                              pauseMutation.mutate({
                                id: item.id,
                                paused: !item.paused,
                              })
                            }
                            onDelete={() => setDeleteTarget(item)}
                          />
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SkeletonWrapper>
        </CardContent>
        {items.length > due.length && (
          <CardFooter>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide {hiddenCount} not due
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show all ({items.length})
                </>
              )}
            </Button>
          </CardFooter>
        )}
      </Card>

      <RecurringItemDialog
        item={editItem ?? undefined}
        currency={currency}
        open={editItem !== null}
        onOpenChange={(next) => {
          if (!next) setEditItem(null);
        }}
      />
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the bill. Transactions already recorded
              stay in the ledger. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate({ id: deleteTarget.id });
                }
              }}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Delete bill"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const UpcomingBillActions = ({
  item,
  onEdit,
  onPause,
  onDelete,
}: {
  item: RecurringItemDraft;
  onEdit: () => void;
  onPause: () => void;
  onDelete: () => void;
}) => {
  return (
    <Tooltip>
      <DropdownMenu>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted"
                  aria-label={`Open actions for ${item.name}`}
                />
              }
            />
          }
        >
          <span className="sr-only">Open actions</span>
          <MoreHorizontal className="h-4 w-4" />
        </TooltipTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onEdit}
            className="flex items-center gap-2"
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onPause}
            className="flex items-center gap-2"
          >
            {item.paused ? (
              <Play className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Pause className="h-4 w-4 text-muted-foreground" />
            )}
            {item.paused ? "Resume" : "Pause"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDelete}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipContent>Actions</TooltipContent>
    </Tooltip>
  );
};

export default UpcomingBills;
