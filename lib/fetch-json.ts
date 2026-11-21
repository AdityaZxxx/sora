import type { z } from "zod";

import { format } from "date-fns";

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

type QueryParam = string | number | Date | null | undefined;

type ReadOptions<T> = {
  params?: Record<string, QueryParam>;
  schema?: z.ZodType<T>;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

function withParams(path: string, params?: Record<string, QueryParam>) {
  if (!params) return path;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    search.set(
      key,
      value instanceof Date ? format(value, "yyyy-MM-dd") : String(value),
    );
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
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
  path: string,
  errorMessage: string,
  options?: ReadOptions<T>,
): Promise<T> {
  const response = await fetch(withParams(path, options?.params));
  if (!response.ok) {
    throw new Error(errorMessage);
  }
  const body = reviveDates(await response.json());
  return (options?.schema ? options.schema.parse(body) : body) as T;
}
