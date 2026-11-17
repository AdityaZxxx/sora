import type { GetTransactionsHistoryResponseType } from "@/lib/transactions";

import { categoryIconLabel } from "@/lib/category-icons";

export function getCsvData(
  transactions: GetTransactionsHistoryResponseType | undefined,
  formatAmount: (value: number) => string,
  currency: string,
) {
  if (!transactions) return [];

  return transactions.map((transaction) => ({
    Date: new Date(transaction.date).toLocaleDateString(),
    Category: transaction.category,
    Description: transaction.description,
    Type: transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
    Amount:
      transaction.type === "expense"
        ? `-${formatAmount(transaction.amount)}`
        : formatAmount(transaction.amount),
    Currency: currency,
  }));
}

export function getCategoryOptions(
  transactions: GetTransactionsHistoryResponseType,
) {
  const categories = new Map<string, { value: string; label: string }>();
  for (const transaction of transactions) {
    categories.set(transaction.category, {
      value: transaction.category,
      label: `${categoryIconLabel({
        icon: transaction.categoryIcon,
        iconKind: transaction.categoryIconKind,
      })} ${transaction.category}`,
    });
  }
  return Array.from(categories.values());
}

export function escapeCell(value: string) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
