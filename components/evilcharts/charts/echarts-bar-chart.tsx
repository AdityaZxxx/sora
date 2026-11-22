"use client";

import type { ComposeOption } from "echarts/core";

import { BarChart, type BarSeriesOption } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  type GridComponentOption,
} from "echarts/components";
import * as echarts from "echarts/core";
import { useReducedMotion } from "motion/react";
import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  type FC,
  type ReactNode,
} from "react";

import {
  buildChartCss,
  flattenColor,
  resolveColors,
  withAlpha,
  type ChartConfig,
  type ResolvedColors,
} from "@/components/evilcharts/ui/echarts-chart";

export type { ChartConfig };

echarts.use([BarChart, GridComponent, TooltipComponent]);

type EChartsInstance = ReturnType<typeof echarts.init>;

type EChartsOption = ComposeOption<BarSeriesOption | GridComponentOption>;

type ArrayItem<T> = T extends readonly (infer U)[] ? U : T;
type XAxisOption = ArrayItem<NonNullable<EChartsOption["xAxis"]>>;
type YAxisOption = ArrayItem<NonNullable<EChartsOption["yAxis"]>>;

const DEFAULT_BAR_RADIUS = 2;
const BAR_GROW_DURATION_MS = 500;
const BAR_STAGGER_MS = 50;
const HOVER_BLUR = 0.3;
const GRAY = "rgba(120, 120, 120, 1)";

export interface EChartsBarChartProps<TData extends Record<string, unknown>> {
  data: TData[];
  config: ChartConfig;
  className?: string;
  xDataKey?: keyof TData & string;
  barGap?: number;
  barCategoryGap?: number;
  ariaLabel?: string;
  categoryLabel?: string;
  valueFormatter?: (value: number) => string;
  chartOptions?: Record<string, unknown>;
  children?: ReactNode;
}

export interface BarProps {
  dataKey: string;
  enableHoverHighlight?: boolean;
}

const Bar: FC<BarProps> = () => null;

export interface AxisProps {
  dataKey?: string;
  tickFormatter?: (value: string, index: number) => string;
}

const XAxis: FC<AxisProps> = () => null;
const YAxis: FC<AxisProps> = () => null;
const Grid: FC = () => null;

type BarConfig = {
  dataKey: string;
  enableHoverHighlight: boolean;
};

type AxisSlot = {
  present: boolean;
  dataKey?: string;
  tickFormatter?: (value: string, index: number) => string;
};

type CollectedConfig = {
  bars: BarConfig[];
  xAxis: AxisSlot;
  yAxis: AxisSlot;
  showGrid: boolean;
};

function collectConfig(children: ReactNode): CollectedConfig {
  const bars: BarConfig[] = [];
  let xAxis: AxisSlot = { present: false };
  let yAxis: AxisSlot = { present: false };
  let showGrid = false;

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === Bar) {
      const props = child.props as BarProps;
      bars.push({
        dataKey: props.dataKey,
        enableHoverHighlight: props.enableHoverHighlight ?? false,
      });
    } else if (child.type === XAxis) {
      const props = child.props as AxisProps;
      xAxis = {
        present: true,
        dataKey: props.dataKey,
        tickFormatter: props.tickFormatter,
      };
    } else if (child.type === YAxis) {
      const props = child.props as AxisProps;
      yAxis = {
        present: true,
        dataKey: props.dataKey,
        tickFormatter: props.tickFormatter,
      };
    } else if (child.type === Grid) {
      showGrid = true;
    }
  });

  return { bars, xAxis, yAxis, showGrid };
}

function barPaint(slots: string[]): string | echarts.graphic.LinearGradient {
  const base = slots[0] ?? GRAY;
  if (slots.length <= 1) return base;
  const stops = slots.map((color, index) => ({
    offset: index / (slots.length - 1),
    color,
  }));
  return new echarts.graphic.LinearGradient(0, 0, 0, 1, stops);
}

function buildChartOption(
  data: Record<string, unknown>[],
  config: ChartConfig,
  collected: CollectedConfig,
  seriesKeys: string[],
  categoryKey: string,
  resolved: ResolvedColors,
  barGap: number | undefined,
  barCategoryGap: number | undefined,
): EChartsOption {
  const { tokens } = resolved;
  const { bars, xAxis: categorySlot, yAxis: valueSlot, showGrid } = collected;
  const categories = data.map((row) => String(row[categoryKey]));
  const splitLineColor = withAlpha(tokens.border, 1);
  const tickDotColor = flattenColor(splitLineColor, tokens.background);

  const xAxis: XAxisOption = {
    type: "category",
    boundaryGap: true,
    show: true,
    data: categories,
    axisLine: { show: false },
    axisTick: {
      show: categorySlot.present,
      length: 0.5,
      alignWithLabel: true,
      lineStyle: { color: tickDotColor, width: 3, cap: "round" },
    },
    splitLine: { show: false },
    axisLabel: {
      show: categorySlot.present,
      color: tokens.mutedForeground,
      fontSize: 14,
      margin: 8,
      formatter: categorySlot.tickFormatter,
    },
  };

  const yAxis: YAxisOption = {
    type: "value",
    show: valueSlot.present || showGrid,
    axisLine: { show: false },
    axisTick: {
      show: valueSlot.present,
      length: 0.5,
      lineStyle: { color: tickDotColor, width: 3, cap: "round" },
    },
    splitLine: {
      show: showGrid,
      lineStyle: { color: splitLineColor, type: [3, 3], width: 1 },
    },
    axisLabel: {
      show: valueSlot.present,
      color: tokens.mutedForeground,
      fontSize: 14,
      margin: 8,
      formatter: valueSlot.tickFormatter
        ? (value: number, index: number) =>
            valueSlot.tickFormatter?.(String(value), index) ?? ""
        : undefined,
    },
  };

  const series: BarSeriesOption[] = bars.map((bar) => {
    const label = config[bar.dataKey]?.label;
    return {
      id: bar.dataKey,
      name: typeof label === "string" ? label : bar.dataKey,
      type: "bar",
      data: data.map((row) =>
        row[bar.dataKey] == null ? null : Number(row[bar.dataKey]) || 0,
      ),
      barGap,
      barCategoryGap,
      cursor: "default",
      itemStyle: {
        color: barPaint(resolved.series[bar.dataKey] ?? []),
        borderRadius: DEFAULT_BAR_RADIUS,
      },
      emphasis: bar.enableHoverHighlight
        ? { focus: "self" as const, blurScope: "coordinateSystem" as const }
        : { disabled: true },
      blur: bar.enableHoverHighlight
        ? { itemStyle: { opacity: HOVER_BLUR } }
        : undefined,
      animationDuration: BAR_GROW_DURATION_MS,
      animationEasing: "cubicOut",
      animationDelay: (index: number) => index * BAR_STAGGER_MS,
    };
  });

  return {
    animation: false,
    grid: { left: 8, right: 8, top: 16, bottom: 8 },
    xAxis,
    yAxis,
    series,
  };
}

export function EChartsBarChart<TData extends Record<string, unknown>>({
  data,
  config,
  className,
  xDataKey,
  barGap,
  barCategoryGap,
  ariaLabel,
  categoryLabel,
  valueFormatter,
  chartOptions,
  children,
}: EChartsBarChartProps<TData>) {
  const rawId = useId();
  const chartId = `chart-${rawId.replace(/:/g, "")}`;

  const containerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const echartsRef = useRef<EChartsInstance | null>(null);
  const pushRef = useRef<(withEntrance?: boolean) => void>(() => {});
  const hasRevealedRef = useRef(false);
  const shouldReduceMotion = useReducedMotion();

  const collected = useMemo(() => collectConfig(children), [children]);
  const seriesKeys = useMemo(
    () => collected.bars.map((bar) => bar.dataKey),
    [collected.bars],
  );
  const categoryKey = useMemo(() => {
    if (collected.xAxis.dataKey) return collected.xAxis.dataKey;
    if (xDataKey) return xDataKey as string;
    const firstRow = data[0];
    if (firstRow) {
      const claimed = new Set(seriesKeys);
      const found = Object.keys(firstRow).find((key) => !claimed.has(key));
      if (found) return found;
    }
    return "";
  }, [collected.xAxis.dataKey, xDataKey, data, seriesKeys]);

  const css = useMemo(() => buildChartCss(chartId, config), [chartId, config]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const chart = echarts.init(mount);
    echartsRef.current = chart;

    const resizeObserver = new ResizeObserver(() => {
      if (
        mount.clientWidth === chart.getWidth() &&
        mount.clientHeight === chart.getHeight()
      ) {
        return;
      }
      chart.resize();
      pushRef.current(false);
    });
    resizeObserver.observe(mount);

    const themeObserver = new MutationObserver(() => pushRef.current(false));
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      resizeObserver.disconnect();
      themeObserver.disconnect();
      chart.dispose();
      echartsRef.current = null;
      hasRevealedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const chart = echartsRef.current;
    const container = containerRef.current;
    if (!chart || !container) return;

    const push = (withEntrance: boolean) => {
      const resolved = resolveColors(container, config, seriesKeys);
      const option = buildChartOption(
        data,
        config,
        collected,
        seriesKeys,
        categoryKey,
        resolved,
        barGap,
        barCategoryGap,
      );
      const merged = chartOptions ? { ...option, ...chartOptions } : option;
      Object.assign(merged, {
        animation: withEntrance,
        animationDuration: BAR_GROW_DURATION_MS,
        animationDurationUpdate: 0,
      });
      chart.setOption(merged as EChartsOption, { notMerge: true });
    };

    pushRef.current = (withEntrance = false) => push(withEntrance);
    const withEntrance = !hasRevealedRef.current && !shouldReduceMotion;
    hasRevealedRef.current = true;
    push(withEntrance);
  }, [
    chartOptions,
    config,
    collected,
    seriesKeys,
    categoryKey,
    data,
    barGap,
    barCategoryGap,
    shouldReduceMotion,
  ]);

  const seriesLabels = seriesKeys.map((key) => {
    const label = config[key]?.label;
    return typeof label === "string" ? label : key;
  });
  const chartLabel =
    ariaLabel ??
    `Bar chart of ${seriesLabels.join(", ")} across ${data.length} ${data.length === 1 ? "category" : "categories"}`;
  const tableCategoryLabel =
    categoryLabel ?? collected.xAxis.dataKey ?? "Category";
  const formatValue =
    valueFormatter ?? ((value: number) => value.toLocaleString());
  const formatCategory = (row: TData, index: number) => {
    const raw = String(row[categoryKey] ?? "");
    return collected.xAxis.tickFormatter
      ? collected.xAxis.tickFormatter(raw, index)
      : raw;
  };

  return (
    <div
      ref={containerRef}
      data-chart={chartId}
      className={`relative flex flex-col text-xs ${className ?? ""}`}
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="relative min-h-0 w-full flex-1">
        <div
          ref={mountRef}
          role="img"
          aria-label={chartLabel}
          className="h-full min-h-0 w-full"
        />
      </div>

      <div className="sr-only">
        <table>
          <caption>{chartLabel}</caption>
          <thead>
            <tr>
              <th scope="col">{tableCategoryLabel}</th>
              {seriesLabels.map((label, index) => (
                <th scope="col" key={seriesKeys[index]}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                <th scope="row">{formatCategory(row, index)}</th>
                {seriesKeys.map((key) => (
                  <td key={key}>
                    {row[key] == null ? "" : formatValue(Number(row[key]) || 0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

EChartsBarChart.Bar = Bar;
EChartsBarChart.XAxis = XAxis;
EChartsBarChart.YAxis = YAxis;
EChartsBarChart.Grid = Grid;
