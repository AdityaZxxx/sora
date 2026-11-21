import { Prisma } from "@prisma/client";

const { Decimal } = Prisma;

export type Money = Prisma.Decimal;

export function toMoney(value: number | string | Money): Money {
  return new Decimal(value);
}

export function zeroMoney(): Money {
  return new Decimal(0);
}

export function sumMoney(values: Money[]): Money {
  return values.reduce((total, value) => total.plus(value), zeroMoney());
}

export function moneyDifference(a: number | Money, b: number | Money): Money {
  return toMoney(a).minus(toMoney(b));
}

export function moneyText(value: number | Money): string {
  return new Decimal(value).toFixed(2);
}
