export type MoneyTooltipRow = {
  key: "income" | "expense";
  label: string;
  value: number;
  color: string;
};

const tooltipShell =
  "grid min-w-36 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl backdrop-blur-sm";

export const MONEY_TOOLTIP_OPTIONS = {
  trigger: "axis",
  confine: true,
  backgroundColor: "transparent",
  padding: 0,
  borderWidth: 0,
  extraCssText: "box-shadow:none;",
  axisPointer: { type: "none" },
} as const;

export function netClass(net: number) {
  return net >= 0 ? "text-income-foreground" : "text-expense-foreground";
}

export function netSign(net: number) {
  return net >= 0 ? "+" : "";
}

export function moneyTooltip({
  header,
  income,
  expense,
  rows,
  formatter,
}: {
  header: string;
  income: number;
  expense: number;
  rows: MoneyTooltipRow[];
  formatter: { format: (value: number) => string };
}) {
  const net = income - expense;
  const body = rows
    .map((row) => {
      const dot = `<span aria-hidden="true" class="h-2.5 w-2.5 shrink-0 rounded-[2px]" style="background:${row.color}"></span>`;
      return `
          <div class="flex w-full items-center gap-2">
            ${dot}
            <span class="flex flex-1 justify-between gap-4">
              <span class="text-muted-foreground">${row.label}</span>
              <span class="font-mono tabular-nums">${formatter.format(row.value)}</span>
            </span>
          </div>`.trim();
    })
    .join("");

  return `
      <div class="${tooltipShell}">
        <div class="flex w-full items-center justify-between gap-4">
          <span class="font-medium">${header}</span>
          <span class="font-mono tabular-nums ${netClass(net)}">${netSign(net)}${formatter.format(net)}</span>
        </div>
        <div class="grid gap-1.5">${body}</div>
      </div>`.trim();
}
