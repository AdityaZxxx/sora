import type { TransactionHistoryRow } from "@/lib/transactions";

import { categoryIconLabel } from "@/lib/category-icons";
import { formatDateForDisplay } from "@/lib/helpers";
import { moneyNumber } from "@/lib/money";

export function getCsvData(
  transactions: TransactionHistoryRow[],
  formatAmount: (value: number) => string,
  currency: string,
) {
  return transactions.map((transaction) => {
    const amount = moneyNumber(transaction.amount);
    return {
      Date: formatDateForDisplay(new Date(transaction.date)),
      Category: transaction.category,
      Description: transaction.description,
      Type:
        transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
      Amount:
        transaction.type === "expense"
          ? `-${formatAmount(amount)}`
          : formatAmount(amount),
      Currency: currency,
    };
  });
}

export function getCategoryOptions(transactions: TransactionHistoryRow[]) {
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
