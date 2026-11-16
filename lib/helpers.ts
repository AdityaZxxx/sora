import { DEFAULT_CURRENCY } from "./constants";
import { Currencies } from "./currencies";

export function resolveCurrency(currency: string | null | undefined) {
  return currency ?? DEFAULT_CURRENCY;
}

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

export function getFormatterForCurrency(currency: string) {
  const locale = localeForCurrency(currency);

  return {
    format: (value: number) => {
      const formatter = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: value % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      });
      return formatter.format(value);
    },
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
