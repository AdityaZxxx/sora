import { Currencies } from "./currencies";

export function dateToUtcDate(date: Date) {
  return new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds(),
    ),
  );
}

export function hasTwoDecimals(value: number) {
  if (!Number.isFinite(value)) {
    return false;
  }
  const ratio = value / 0.01;
  const rounded = Math.round(ratio);
  const tolerance = 4 * Number.EPSILON * Math.max(Math.abs(ratio), 1);
  return Math.abs(ratio - rounded) < tolerance;
}

const localeForCurrency = (currency: string) =>
  Currencies.find((c) => c.value === currency)?.locale;

type CurrencyFormatters = {
  whole: Intl.NumberFormat;
  fractional: Intl.NumberFormat;
};

const currencyFormatters = new Map<string, CurrencyFormatters>();

function cachedFormatters(currency: string): CurrencyFormatters {
  const existing = currencyFormatters.get(currency);
  if (existing) return existing;

  const locale = localeForCurrency(currency);
  const options = {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  } satisfies Intl.NumberFormatOptions;
  const formatters = {
    whole: new Intl.NumberFormat(locale, {
      ...options,
      minimumFractionDigits: 0,
    }),
    fractional: new Intl.NumberFormat(locale, {
      ...options,
      minimumFractionDigits: 2,
    }),
  };
  currencyFormatters.set(currency, formatters);
  return formatters;
}

export function getFormatterForCurrency(currency: string) {
  const formatters = cachedFormatters(currency);
  return {
    format: (value: number) =>
      (value % 1 === 0 ? formatters.whole : formatters.fractional).format(
        value,
      ),
  };
}

export function formatDateForDisplay(date: Date) {
  return date.toLocaleDateString("default", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function getNumberInputSeparators(currency: string | null | undefined) {
  const parts = new Intl.NumberFormat(localeForCurrency(currency ?? "USD"), {
    style: "decimal",
  }).formatToParts(1234.5);

  return {
    group: parts.find((part) => part.type === "group")?.value ?? ",",
    decimal: parts.find((part) => part.type === "decimal")?.value ?? ".",
  };
}

export function getNumberFlowCurrencyProps(currency: string) {
  return {
    locales: localeForCurrency(currency),
    format: {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      trailingZeroDisplay: "stripIfInteger",
    } satisfies Intl.NumberFormatOptions,
  };
}
