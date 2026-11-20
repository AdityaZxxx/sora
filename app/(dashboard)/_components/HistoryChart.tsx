"use client";
import type { Timeframe } from "@/lib/types";

import {
  EChartsBarChart,
  type ChartConfig,
} from "@/components/evilcharts/charts/echarts-bar-chart";
import { MONEY_TOOLTIP_OPTIONS, moneyTooltip } from "@/components/money-chart";
import { useMediaQuery } from "@/hooks/use-media-query";

export type HistoryChartRow = {
  year: number;
  month: number;
  expense: number;
  income: number;
  day?: number;
};

export type SeriesKey = "income" | "expense";

interface Props {
  data: HistoryChartRow[];
  timeframe: Timeframe;
  formatter: { format: (value: number) => string };
  hidden: ReadonlySet<SeriesKey>;
}

type TooltipParam = {
  axisValue?: string | number;
  name?: string;
  seriesId?: string;
  seriesName?: string;
  value?: number | string | null;
};

type TopLevelFormatterParams = TooltipParam | TooltipParam[];

const chartConfig = {
  income: {
    label: "Income",
    colors: { light: ["var(--income)"], dark: ["var(--income)"] },
  },
  expense: {
    label: "Expense",
    colors: { light: ["var(--expense)"], dark: ["var(--expense)"] },
  },
} satisfies ChartConfig;

function bucketKey(row: HistoryChartRow, timeframe: Timeframe) {
  return String(timeframe === "year" ? row.month : (row.day ?? 0));
}

const monthShort = (monthIndex: number) =>
  new Date(2024, monthIndex, 1).toLocaleDateString(undefined, {
    month: "short",
  });

// ECharts appends the tooltip DOM to document.body, outside [data-chart],
// so the dots must reference globally resolvable tokens, not chart-scoped ones.
const seriesSwatch = (key: SeriesKey) =>
  key === "income" ? "var(--income)" : "var(--expense)";

export default function HistoryChart({
  data,
  timeframe,
  formatter,
  hidden,
}: Props) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const rows = data.map((row) => ({
    ...row,
    key: bucketKey(row, timeframe),
  }));

  const tooltipFormatter = (params: TopLevelFormatterParams) => {
    const items: TooltipParam[] = Array.isArray(params) ? params : [params];
    const first = items.find((item) => item != null);
    const axisLabel = first?.axisValue ?? first?.name ?? "";
    const bucketIndex = Number.parseInt(String(axisLabel), 10);
    const row = rows.find((entry) => entry.key === String(bucketIndex));
    if (!row) return "";

    const header = new Date(
      row.year,
      row.month,
      row.day ?? 1,
    ).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return moneyTooltip({
      header,
      income: row.income,
      expense: row.expense,
      rows: (["income", "expense"] as const).flatMap((key) =>
        hidden.has(key)
          ? []
          : [
              {
                key,
                label: key === "income" ? "Income" : "Expense",
                value: key === "income" ? row.income : row.expense,
                color: seriesSwatch(key),
              },
            ],
      ),
      formatter,
    });
  };

  return (
    <EChartsBarChart
      data={rows}
      config={chartConfig}
      barCategoryGap={8}
      barGap={1}
      className="h-full w-full"
      xDataKey="key"
      ariaLabel={`Income and expense by ${timeframe === "year" ? "month" : "day"}`}
      categoryLabel={timeframe === "year" ? "Month" : "Day"}
      valueFormatter={(value) => formatter.format(value)}
      chartOptions={{
        tooltip: {
          ...MONEY_TOOLTIP_OPTIONS,
          formatter: tooltipFormatter,
        },
      }}
    >
      <EChartsBarChart.Grid />
      <EChartsBarChart.XAxis
        dataKey="key"
        tickFormatter={(value: string) =>
          timeframe === "year" ? monthShort(Number.parseInt(value, 10)) : value
        }
      />
      {isDesktop && (
        <EChartsBarChart.YAxis
          tickFormatter={(value: string) => formatter.format(Number(value))}
        />
      )}
      {hidden.has("income") ? null : (
        <EChartsBarChart.Bar
          dataKey="income"
          variant="default"
          enableHoverHighlight
        />
      )}
      {hidden.has("expense") ? null : (
        <EChartsBarChart.Bar
          dataKey="expense"
          variant="default"
          enableHoverHighlight
        />
      )}
    </EChartsBarChart>
  );
}
