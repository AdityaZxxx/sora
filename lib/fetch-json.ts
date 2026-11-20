import type { z } from "zod";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type ReadValue =
  | string
  | number
  | boolean
  | null
  | Date
  | ReadValue[]
  | { [key: string]: ReadValue };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

export async function fetchJson<TSchema extends z.ZodType>(
  url: string,
  schema: TSchema,
  errorMessage: string,
): Promise<z.output<TSchema>> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(errorMessage);
  }

  const body: unknown = await response.json();
  return schema.parse(body);
}

function reviveDates(value: JsonValue): ReadValue {
  if (typeof value === "string" && ISO_DATE.test(value)) {
    return new Date(value);
  }
  if (Array.isArray(value)) {
    return value.map(reviveDates);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, reviveDates(item)]),
    );
  }
  return value;
}

export async function fetchReadJson<T>(
  url: string,
  errorMessage: string,
): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return reviveDates(await response.json()) as T;
}
