"use client";

import type { MonthlyRollup } from "@/lib/insights";

import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

import { MONEY_TOOLTIP_OPTIONS, moneyTooltip } from "@/components/money-chart";
import { useMediaQuery } from "@/hooks/use-media-query";
import { moneyNumber } from "@/lib/money";

interface Props {
  months: MonthlyRollup;
  formatter: { format: (value: number) => string };
}

type TooltipParam = {
  axisValue?: string | number;
  name?: string;
  seriesName?: string;
  value?: number | string | null;
  dataIndex?: number;
};

type TopLevelFormatterParams = TooltipParam | TooltipParam[];

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

const shortMonth = (month: number) =>
  new Date(Date.UTC(2024, month, 1)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
  });

const fullMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });

const readToken = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export default function InsightsTrendChart({ months, formatter }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const chartLabel = `Income and expense trend over the last ${months.length} months`;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const labels = months.map((bucket) => shortMonth(bucket.month));
    const values = months.map((bucket) => ({
      income: moneyNumber(bucket.income),
      expense: moneyNumber(bucket.expense),
    }));
    const income = readToken("--income");
    const expense = readToken("--expense");
    const muted = readToken("--muted-foreground");

    const tooltipFormatter = (raw: TopLevelFormatterParams) => {
      const items: TooltipParam[] = Array.isArray(raw) ? raw : [raw];
      const index = items[0]?.dataIndex;
      const bucket = index === undefined ? undefined : months[index];
      const value = index === undefined ? undefined : values[index];
      if (!bucket || !value) return "";

      return moneyTooltip({
        header: fullMonth(bucket.year, bucket.month),
        income: value.income,
        expense: value.expense,
        rows: [
          {
            key: "income",
            label: "Income",
            value: value.income,
            color: income,
          },
          {
            key: "expense",
            label: "Expense",
            value: value.expense,
            color: expense,
          },
        ],
        formatter,
      });
    };

    const chart = echarts.init(container, null, { renderer: "canvas" });
    chart.setOption({
      grid: {
        top: 12,
        right: 8,
        bottom: 8,
        left: isDesktop ? 68 : 8,
      },
      tooltip: {
        ...MONEY_TOOLTIP_OPTIONS,
        formatter: tooltipFormatter as never,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: labels,
        axisLine: { lineStyle: { color: "transparent" } },
        axisTick: { show: false },
        axisLabel: { color: muted, fontSize: 14 },
      },
      yAxis: {
        type: "value",
        splitLine: {
          lineStyle: {
            color: muted,
            opacity: 0.18,
            type: "dashed",
          },
        },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: isDesktop
          ? {
              color: muted,
              fontSize: 14,
              formatter: (value: number) => formatter.format(value),
            }
          : { show: false },
      },
      series: [
        {
          name: "Income",
          type: "line",
          smooth: 0.35,
          emphasis: { disabled: true },
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 2.5 },
          itemStyle: { color: income },
          areaStyle: income ? { color: income, opacity: 0.16 } : undefined,
          data: values.map((value) => value.income),
          animationDuration: shouldReduceMotion ? 0 : 1100,
          animationDelay: shouldReduceMotion ? 0 : 150,
        },
        {
          name: "Expense",
          type: "line",
          smooth: 0.35,
          emphasis: { disabled: true },
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 2.5 },
          itemStyle: { color: expense },
          areaStyle: expense ? { color: expense, opacity: 0.16 } : undefined,
          data: values.map((value) => value.expense),
          animationDuration: shouldReduceMotion ? 0 : 1100,
          animationDelay: shouldReduceMotion ? 0 : 300,
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [months, formatter, shouldReduceMotion, isDesktop]);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
      <div
        ref={mountRef}
        role="img"
        aria-label={chartLabel}
        className="h-full min-h-0 w-full"
      />
      <table className="sr-only">
        <caption>{chartLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Income</th>
            <th scope="col">Expense</th>
          </tr>
        </thead>
        <tbody>
          {months.map((bucket) => (
            <tr key={`${bucket.year}-${bucket.month}`}>
              <th scope="row">{fullMonth(bucket.year, bucket.month)}</th>
              <td>{formatter.format(moneyNumber(bucket.income))}</td>
              <td>{formatter.format(moneyNumber(bucket.expense))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
