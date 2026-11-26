"use client";
import type { TransactionType } from "@/lib/types";
import type { Category, Wallet } from "@prisma/client";

import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  Link2,
  MoreHorizontal,
  Pencil,
  TrashIcon,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

import CategoryIcon from "@/components/CategoryIcon";
import { CurrencyComboBox } from "@/components/CurrencyComboBox";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import AddIconButton from "@/components/ui/add-icon-button";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useCallerRole,
  useFormerMembers,
  useMembers,
} from "@/hooks/use-members";
import { useWallets } from "@/hooks/use-wallets";
import { DEFAULT_CURRENCY, QUERY_STALE_TIME } from "@/lib/constants";
import { fetchReadJson } from "@/lib/fetch-json";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { walletLabel } from "@/lib/wallet-label";

import CreateCategoryDialog from "../../_components/CreateCategoryDialog";
import DeleteCategoryDialog from "../../_components/DeletecategoryDialog";
import EditCategoryDialog from "../../_components/EditCategoryDialog";
import BudgetsSection from "./BudgetsSection";
import InviteLinkDialog from "./InviteLinkDialog";
import MembersSection from "./MembersSection";
import WalletSection from "./WalletSection";

const ManagePageClient = ({ wallet }: { wallet: Wallet }) => {
  const { canEdit, canManage } = useCallerRole();
  const walletsQuery = useWallets();
  const owningWallet = walletsQuery.data?.wallets.find(
    (item) => item.id === wallet.id,
  );
  const walletName = owningWallet ? walletLabel(owningWallet) : "Wallet";
  const membersQuery = useMembers();
  const formerMembersQuery = useFormerMembers();

  const creatorNames = new Map<string, string>();
  for (const member of membersQuery.data ?? []) {
    creatorNames.set(member.userId, member.user.name);
  }
  for (const member of formerMembersQuery.data ?? []) {
    creatorNames.set(member.userId, member.user.name);
  }
  return (
    <div className="min-h-screen bg-background">
      <header className="container pt-6">
        <div className="rounded-xl border bg-card px-6 py-8">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Manage</h1>
            <p className="text-muted-foreground">
              Manage your wallet's members, categories and budgets
            </p>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <div className="space-y-8">
          <div className={cn("grid gap-6", canEdit && "md:grid-cols-2")}>
            {canManage ? (
              <section className="h-full">
                <Card className="h-full transition-all hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">Invite link</CardTitle>
                    <CardDescription>
                      Share a revocable link or QR code to add another member to
                      your wallet
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <InviteLinkDialog
                      trigger={
                        <Button className="gap-2">
                          <Link2 className="h-4 w-4" />
                          Manage invite link
                        </Button>
                      }
                    />
                  </CardContent>
                </Card>
              </section>
            ) : (
              <p className="self-center text-sm text-muted-foreground">
                Only an owner or co-owner can manage invite links here.
              </p>
            )}
            <WalletSection canEdit={canManage} />
          </div>

          <MembersSection />

          <section>
            <Card className="transition-all hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Currency settings</CardTitle>
                <CardDescription>
                  Set the currency for your transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canManage ? (
                  <div className="max-w-xs">
                    <CurrencyComboBox
                      key={wallet.id}
                      currency={wallet.currency ?? DEFAULT_CURRENCY}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Only an owner or co-owner can change the currency.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-semibold tracking-tight">
              Transaction categories
            </h2>
            {!canEdit && (
              <p className="text-sm text-muted-foreground">
                Viewers can see categories but cannot add new ones.
              </p>
            )}
            <div className="grid gap-6 md:grid-cols-2">
              <CategoryList
                type="income"
                canEdit={canEdit}
                canManage={canManage}
                creatorNames={creatorNames}
                walletName={walletName}
              />
              <CategoryList
                type="expense"
                canEdit={canEdit}
                canManage={canManage}
                creatorNames={creatorNames}
                walletName={walletName}
              />
            </div>
          </section>

          <BudgetsSection
            key={`budgets-${wallet.id}`}
            canEdit={canManage}
            wallet={wallet}
          />
        </div>
      </div>
    </div>
  );
};

export default ManagePageClient;

const COLLAPSED_CATEGORIES = 6;

function CategoryList({
  type,
  canEdit,
  canManage,
  creatorNames,
  walletName,
}: {
  type: TransactionType;
  canEdit: boolean;
  canManage: boolean;
  creatorNames: Map<string, string>;
  walletName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const {
    data: categories = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Category[]>({
    queryKey: queryKeys.categories(type),
    queryFn: () =>
      fetchReadJson<Category[]>(
        "/api/categories",
        "Unable to load categories. Try again.",
        { params: { type } },
      ),
    retry: 1,
    staleTime: QUERY_STALE_TIME,
    refetchOnWindowFocus: true,
  });

  const typeConfig = {
    income: {
      label: "Income",
      color: "text-income-foreground",
      bgColor: "bg-income-soft",
      icon: <TrendingUp className="h-6 w-6 text-income-foreground" />,
    },
    expense: {
      label: "Expense",
      color: "text-expense-foreground",
      bgColor: "bg-expense-soft",
      icon: <TrendingDown className="h-6 w-6 text-expense-foreground" />,
    },
  }[type];

  return (
    <SkeletonWrapper isLoading={isLoading}>
      <Card className="h-full transition-all hover:shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`rounded-lg p-3 ${typeConfig.bgColor}`}>
                {typeConfig.icon}
              </div>
              <div>
                <CardTitle>{typeConfig.label} categories</CardTitle>
                <CardDescription>
                  {categories.length}{" "}
                  {categories.length === 1 ? "item" : "items"}
                </CardDescription>
              </div>
            </div>
            {canEdit && (
              <CreateCategoryDialog
                type={type}
                successCallback={() => refetch()}
                trigger={<AddIconButton label={`Create ${type} category`} />}
              />
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {isError ? (
            <ErrorState type={type} onRetry={refetch} />
          ) : categories.length === 0 ? (
            <EmptyState type={type} />
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {(expanded
                  ? categories
                  : categories.slice(0, COLLAPSED_CATEGORIES)
                ).map((category) => (
                  <CategoryCard
                    key={category.name}
                    category={category}
                    canManage={canManage}
                    creatorName={
                      (category.createdById
                        ? creatorNames.get(category.createdById)
                        : null) ?? category.createdByName
                    }
                    walletName={walletName}
                  />
                ))}
              </div>
              {categories.length > COLLAPSED_CATEGORIES && (
                <Button
                  variant="ghost"
                  className="w-full justify-between text-muted-foreground"
                  aria-expanded={expanded}
                  onClick={() => setExpanded((current) => !current)}
                >
                  <span className="text-sm">
                    {expanded
                      ? "Show fewer"
                      : `Show all ${categories.length} ${type} categories`}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      expanded && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </SkeletonWrapper>
  );
}

function EmptyState({ type }: { type: TransactionType }) {
  return (
    <EmptyStateUI
      icon={type === "income" ? TrendingUp : TrendingDown}
      hint={`No ${type} categories yet. Add one to get started.`}
    />
  );
}

function ErrorState({
  type,
  onRetry,
}: {
  type: TransactionType;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
      <div className="mb-3 rounded-full bg-destructive/10 p-3">
        <TrashIcon className="h-6 w-6 text-destructive" />
      </div>
      <p className="mb-2 text-sm font-medium text-destructive">
        Unable to load {type} categories. Try again.
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:bg-destructive/10"
        onClick={onRetry}
      >
        Retry
      </Button>
    </div>
  );
}

function CategoryCard({
  category,
  canManage,
  creatorName,
  walletName,
}: {
  category: Category;
  canManage: boolean;
  creatorName: string | null;
  walletName: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="relative flex items-center justify-between rounded-lg border p-4">
        <div className="flex min-w-0 items-center gap-4">
          <CategoryIcon
            icon={category.icon}
            iconKind={category.iconKind}
            iconColor={category.iconColor}
            className="size-6 text-xl"
          />
          <div className="min-w-0">
            <span className="block truncate font-medium">{category.name}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {creatorName
                ? `${walletName} · Added by ${creatorName}`
                : walletName}
            </span>
          </div>
        </div>

        {canManage ? (
          <Tooltip>
            <DropdownMenu>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted"
                        aria-label={`Open actions for ${category.name} category`}
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
        ) : (
          <span className="text-xs text-muted-foreground">
            Only owners and co-owners can rename or delete categories
          </span>
        )}
      </div>
      {canManage && (
        <>
          <EditCategoryDialog
            category={category}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          <DeleteCategoryDialog
            category={category}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
          />
        </>
      )}
    </>
  );
}
