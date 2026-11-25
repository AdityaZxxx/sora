"use client";
import type { Wallet } from "@prisma/client";

import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Target, TrashIcon } from "lucide-react";
import { useState } from "react";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import AddIconButton from "@/components/ui/add-icon-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import EmptyStateUI from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type BudgetWithProgress } from "@/lib/budgets";
import { DEFAULT_CURRENCY, QUERY_STALE_TIME } from "@/lib/constants";
import { fetchReadJson } from "@/lib/fetch-json";
import { getFormatterForCurrency } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

import BudgetDialog from "./BudgetDialog";
import DeleteBudgetDialog from "./DeleteBudgetDialog";

const BudgetsSection = ({
  canEdit,
  wallet,
}: {
  canEdit: boolean;
  wallet: Wallet;
}) => {
  const {
    data: budgets = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.budgets,
    queryFn: () =>
      fetchReadJson<BudgetWithProgress[]>(
        "/api/budgets",
        "Unable to load the budgets. Refresh the page and try again.",
      ),
    staleTime: QUERY_STALE_TIME,
    refetchOnWindowFocus: true,
  });

  const format = getFormatterForCurrency(
    wallet.currency ?? DEFAULT_CURRENCY,
  ).format;

  return (
    <section>
      <Card className="transition-all hover:shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Budgets</CardTitle>
              <CardDescription>
                Monthly spending limits per category
              </CardDescription>
            </div>
            {canEdit && (
              <BudgetDialog
                wallet={wallet}
                trigger={<AddIconButton label="Create budget" />}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <SkeletonWrapper isLoading={isLoading}>
            {isError ? (
              <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
                <p className="mb-2 text-sm font-medium text-destructive">
                  Unable to load budgets. Try again.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : budgets.length === 0 ? (
              <EmptyStateUI
                icon={Target}
                hint="No budgets yet. Add one to track spending per category."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {budgets.map((budget) => (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    wallet={wallet}
                    format={format}
                    canEdit={canEdit}
                  />
                ))}
              </div>
            )}
          </SkeletonWrapper>
        </CardContent>
      </Card>
    </section>
  );
};

export default BudgetsSection;

function BudgetCard({
  budget,
  wallet,
  format,
  canEdit,
}: {
  budget: BudgetWithProgress;
  wallet?: Wallet;
  format: (value: number) => string;
  canEdit: boolean;
}) {
  const overLimit = budget.percent >= 100;
  const nearLimit = budget.percent >= 80 && !overLimit;
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="relative flex flex-col gap-2 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">{budget.category}</span>
            <Badge
              variant={budget.mode === "hard" ? "destructive" : "secondary"}
            >
              {budget.mode}
            </Badge>
          </div>
          {canEdit && (
            <Tooltip>
              <DropdownMenu>
                <TooltipTrigger
                  render={
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted"
                          aria-label={`Open actions for ${budget.category} budget`}
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
                    className="flex items-center gap-2"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center gap-2"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <TrashIcon className="h-4 w-4 text-muted-foreground" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <TooltipContent>Actions</TooltipContent>
            </Tooltip>
          )}
        </div>
        <Progress
          value={Math.min(budget.percent, 100)}
          aria-label={`${budget.category} budget used`}
          indicatorClassName={cn(
            overLimit && "bg-expense",
            nearLimit && "bg-amber-500",
          )}
        />
        <p className="text-xs text-muted-foreground">
          {format(budget.spent)} of {format(budget.amount)} spent ·{" "}
          {format(Math.max(budget.remaining, 0))} remaining ·{" "}
          {Math.round(budget.percent)}%
        </p>
      </div>
      {canEdit && (
        <>
          <BudgetDialog
            budget={budget}
            wallet={wallet}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          <DeleteBudgetDialog
            budget={budget}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
          />
        </>
      )}
    </>
  );
}
