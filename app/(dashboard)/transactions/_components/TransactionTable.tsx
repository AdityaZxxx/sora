"use client";
import type {
  ColumnFiltersState,
  OnChangeFn,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";

import { useInfiniteQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  useTable,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  DownloadIcon,
  MoreHorizontal,
  Pencil,
  TrashIcon,
} from "lucide-react";
import { useRef, useState } from "react";

import CategoryIcon from "@/components/CategoryIcon";
import { DataTableColumnHeader } from "@/components/datatable/ColumnHeader";
import { DataTableViewOptions } from "@/components/datatable/Columntoggle";
import { DataTableFacetedFilter } from "@/components/datatable/FacetedFilters";
import {
  appTableFeatures,
  type AppTableFeatures,
} from "@/components/datatable/table-features";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCallerRole } from "@/hooks/use-members";
import { useActiveWallet } from "@/hooks/use-wallets";
import { useSession } from "@/lib/auth-client";
import {
  QUERY_STALE_TIME,
  TRANSACTION_HISTORY_INITIAL_PAGE_SIZE,
} from "@/lib/constants";
import { fetchReadJson } from "@/lib/fetch-json";
import { formatDateForDisplay, getFormatterForCurrency } from "@/lib/helpers";
import { queryKeys } from "@/lib/query-keys";
import { canEditOwnedRecord } from "@/lib/roles";
import {
  type GetTransactionsHistoryResponseType,
  type TransactionHistoryRow,
} from "@/lib/transactions";
import { cn } from "@/lib/utils";

import CreateTransactionDialog from "../../_components/CreateTransactionDialog";
import DeleteTransactionDialog from "./DeleteTransactionDialog";
import {
  escapeCell,
  getCsvData,
  getCategoryOptions,
} from "./transaction-table-data";

interface Props {
  from: string;
  to: string;
  currency: string;
}

const emptyData: TransactionHistoryRow[] = [];
const PAGE_SIZE_OPTIONS = [10, 20, 50];

async function fetchHistoryPage(
  from: string,
  to: string,
  cursor: string | null,
  limit: number,
): Promise<GetTransactionsHistoryResponseType> {
  return fetchReadJson<GetTransactionsHistoryResponseType>(
    "/api/transaction-history",
    "Failed to fetch transaction history",
    { params: { from, to, limit, cursor } },
  );
}

async function fetchAllHistory(from: string, to: string, limit: number) {
  const rows: TransactionHistoryRow[] = [];
  let cursor: string | null = null;
  do {
    // oxlint-disable-next-line eslint/no-await-in-loop -- the next page needs this page's cursor
    const page = await fetchHistoryPage(from, to, cursor, limit);
    rows.push(...page.transactions);
    cursor = page.nextCursor;
  } while (cursor);
  return rows;
}

const columnHelper = createColumnHelper<
  AppTableFeatures,
  TransactionHistoryRow
>();

const buildColumns = (formatAmount: (value: number) => string) =>
  columnHelper.columns([
    columnHelper.accessor("category", {
      id: "category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category" />
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <CategoryIcon
            icon={row.original.categoryIcon}
            iconKind={row.original.categoryIconKind}
            iconColor={row.original.categoryIconColor}
            className="size-6 text-2xl"
          />
          <span className="font-medium capitalize">
            {row.original.category}
          </span>
        </div>
      ),
    }),
    columnHelper.accessor("description", {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Description" />
      ),
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={row.original.description}
                className="block max-w-[200px] truncate border-0 p-0 text-left capitalize md:max-w-none"
              />
            }
          >
            {row.original.description}
          </TooltipTrigger>
          <TooltipContent>{row.original.description}</TooltipContent>
        </Tooltip>
      ),
    }),
    columnHelper.accessor("addedByName", {
      id: "addedBy",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Added by" />
      ),
      cell: ({ row }) => <AddedByCell transaction={row.original} />,
    }),
    columnHelper.accessor("date", {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => (
        <div className="whitespace-nowrap text-muted-foreground">
          {formatDateForDisplay(new Date(row.original.date))}
        </div>
      ),
      sortFn: (rowA, rowB) => {
        const dateA = new Date(rowA.original.date).getTime();
        const dateB = new Date(rowB.original.date).getTime();
        return dateA - dateB;
      },
    }),
    columnHelper.accessor("type", {
      id: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
      cell: ({ row }) => (
        <Badge
          className={cn(
            "border-transparent px-2.5 text-xs font-medium capitalize",
            row.original.type === "income"
              ? "bg-income-badge text-income-foreground"
              : "bg-expense-badge text-expense-foreground",
          )}
        >
          {row.original.type}
        </Badge>
      ),
    }),
    columnHelper.accessor("amount", {
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Amount"
          className="w-full justify-end"
        />
      ),
      cell: ({ row }) => (
        <p
          className={cn(
            "text-right text-sm font-medium tabular-nums",
            row.original.type === "income"
              ? "text-income-foreground"
              : "text-expense-foreground",
          )}
        >
          {row.original.type === "expense" ? "-" : "+"}
          {formatAmount(row.original.amount)}
        </p>
      ),
    }),
    columnHelper.display({
      id: "actions",
      enableHiding: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => <RowActions transaction={row.original} />,
    }),
  ]);

const TransactionTable = ({ from, to, currency }: Props) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: TRANSACTION_HISTORY_INITIAL_PAGE_SIZE,
  });
  const formatAmount = getFormatterForCurrency(currency).format;
  const columns = buildColumns(formatAmount);

  const history = useInfiniteQuery({
    queryKey: queryKeys.transactions.history(from, to, pagination.pageSize),
    queryFn: ({ pageParam }) =>
      fetchHistoryPage(from, to, pageParam ?? null, pagination.pageSize),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: QUERY_STALE_TIME,
    refetchOnWindowFocus: true,
  });

  const rows = history.data?.pages.flatMap((page) => page.transactions) ?? [];
  const loadedPages = history.data?.pages.length ?? 0;
  const pageCount = Math.max(loadedPages + (history.hasNextPage ? 1 : 0), 1);

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === "function" ? updater(pagination) : updater;
    if (next.pageSize !== pagination.pageSize) {
      setPagination({ pageIndex: 0, pageSize: next.pageSize });
      return;
    }

    setPagination(next);
    if (
      next.pageIndex >= loadedPages &&
      history.hasNextPage &&
      !history.isFetchingNextPage
    ) {
      void history.fetchNextPage();
    }
  };

  const table = useTable({
    data: rows.length > 0 ? rows : emptyData,
    columns,
    features: appTableFeatures,
    state: { sorting, columnFilters, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: handlePaginationChange,
    autoResetPageIndex: false,
    pageCount,
  });

  const totalRows = table.getFilteredRowModel().rows.length;

  const csvData = getCsvData(rows, formatAmount, currency);

  const csvHeaders = [
    { label: "Date", key: "Date" },
    { label: "Category", key: "Category" },
    { label: "Description", key: "Description" },
    { label: "Type", key: "Type" },
    { label: "Amount", key: "Amount" },
    { label: "Currency", key: "Currency" },
  ];

  const categoriesOptions = getCategoryOptions(rows);

  const typeOptions = [
    { label: "Income", value: "income" },
    { label: "Expense", value: "expense" },
  ];

  const downloadCsv = async () => {
    if (csvData.length === 0) return;

    const allRows = await fetchAllHistory(from, to, pagination.pageSize);
    const allCsvData = getCsvData(allRows, formatAmount, currency);
    const lines = [
      csvHeaders.map((h) => escapeCell(h.label)).join(","),
      ...allCsvData.map((row) =>
        csvHeaders
          .map((h) => escapeCell((row as Record<string, string>)[h.key]))
          .join(","),
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transactions_${from}_to_${to}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {table.getColumn("category") && (
            <DataTableFacetedFilter
              title="Category"
              column={table.getColumn("category")}
              options={categoriesOptions}
            />
          )}
          {table.getColumn("type") && (
            <DataTableFacetedFilter
              title="Type"
              column={table.getColumn("type")}
              options={typeOptions}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <DataTableViewOptions table={table} />
          <Button
            type="button"
            variant="outline"
            className="h-10 sm:h-9"
            onClick={downloadCsv}
            disabled={csvData.length === 0}
          >
            <DownloadIcon />
            <span className="sr-only sm:not-sr-only">Export CSV</span>
          </Button>
        </div>
      </div>

      <SkeletonWrapper isLoading={history.isLoading}>
        <div className="relative rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    {history.isError ? (
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-destructive">
                          Unable to load transactions. Check your connection and
                          try again.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => history.refetch()}
                        >
                          Retry
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <p className="font-medium">Nothing in this range</p>
                        <p className="text-sm text-muted-foreground">
                          Try a different date range, or clear the filters to
                          see everything.
                        </p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) =>
                setPagination({ pageIndex: 0, pageSize: Number(value) })
              }
              items={Object.fromEntries(
                PAGE_SIZE_OPTIONS.map((size) => [
                  String(size),
                  `${size} / page`,
                ]),
              )}
            >
              <SelectTrigger aria-label="Rows per page" className="h-10 sm:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-(--anchor-width) min-w-0">
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">
              Page {pagination.pageIndex + 1} of{" "}
              {history.hasNextPage ? `${loadedPages}+` : pageCount}
              <span className="hidden sm:inline">
                : {totalRows} {totalRows === 1 ? "row" : "rows"}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PageButton
              label="Go to first page"
              className="hidden lg:inline-flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft />
            </PageButton>
            <PageButton
              label="Go to previous page"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft />
            </PageButton>
            <PageButton
              label="Go to next page"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage() || history.isFetchingNextPage}
            >
              <ChevronRight />
            </PageButton>
            <PageButton
              label="Go to last page"
              className="hidden lg:inline-flex"
              onClick={() =>
                table.setPageIndex(Math.max(table.getPageCount() - 1, 0))
              }
              disabled={
                !table.getCanNextPage() ||
                history.hasNextPage ||
                history.isFetchingNextPage
              }
            >
              <ChevronsRight />
            </PageButton>
          </div>
        </div>
      </SkeletonWrapper>
    </div>
  );
};

export default TransactionTable;

function PageButton({
  label,
  className,
  disabled,
  onClick,
  children,
}: {
  label: string;
  className?: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className={cn("inline-flex", className)} />}
      >
        <Button
          variant="outline"
          size="icon"
          className="size-10"
          onClick={onClick}
          disabled={disabled}
        >
          <span className="sr-only">{label}</span>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function AddedByCell({ transaction }: { transaction: TransactionHistoryRow }) {
  const { data: session } = useSession();
  const isSelf = session?.user.id === transaction.addedById;
  return (
    <div className="flex items-center gap-2 text-sm whitespace-nowrap text-muted-foreground">
      <span>{isSelf ? "You" : `added by ${transaction.addedByName}`}</span>
      {transaction.addedVia === "agent" && (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Badge variant="outline" className="text-xs">
              Via agent
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Added through an assistant</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function RowActions({ transaction }: { transaction: TransactionHistoryRow }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const editTriggerRef = useRef<HTMLButtonElement>(null);
  const { role, canManage } = useCallerRole();
  const activeWalletQuery = useActiveWallet();
  const currency = activeWalletQuery.active?.currency ?? "USD";
  const { data: session } = useSession();

  const canEditEntry =
    role != null &&
    session?.user.id != null &&
    canEditOwnedRecord(role, transaction.addedById, session.user.id);
  if (!canEditEntry) return null;

  return (
    <>
      <CreateTransactionDialog
        transactionId={transaction.id}
        type={transaction.type as "income" | "expense"}
        currency={currency}
        memberCount={canManage ? 2 : 1}
        initialValues={{
          description: transaction.description,
          category: transaction.category,
          amount: transaction.amount,
          type: transaction.type as "income" | "expense",
          date: transaction.date,
        }}
        trigger={
          <button
            ref={editTriggerRef}
            type="button"
            aria-label="Edit transaction"
            hidden
          />
        }
      />
      <DeleteTransactionDialog
        setOpen={setShowDeleteDialog}
        open={showDeleteDialog}
        transactionId={transaction.id}
      />
      <Tooltip>
        <DropdownMenu>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <Button
                    variant={"ghost"}
                    size="icon"
                    className="max-sm:size-10"
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
              onClick={() => editTriggerRef.current?.click()}
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2"
              onClick={() => {
                setShowDeleteDialog((prev) => !prev);
              }}
            >
              <TrashIcon className="h-4 w-4 text-muted-foreground" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <TooltipContent>Actions</TooltipContent>
      </Tooltip>
    </>
  );
}
