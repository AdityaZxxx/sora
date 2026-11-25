import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

type RequestIdRegistry = typeof globalThis & {
  soraErrorRequestIds?: WeakMap<object, string>;
};

const storage = new AsyncLocalStorage<{ requestId: string }>();
const errorRequestIds = ((
  globalThis as RequestIdRegistry
).soraErrorRequestIds ??= new WeakMap<object, string>());

export async function withRequestId<T>(fn: () => Promise<T>): Promise<T> {
  return storage.run({ requestId: randomUUID() }, fn);
}

export function getRequestId() {
  return storage.getStore()?.requestId;
}

export function rememberErrorRequestId(cause: unknown) {
  const requestId = getRequestId();
  if (requestId && typeof cause === "object" && cause !== null) {
    errorRequestIds.set(cause, requestId);
  }
}

export function errorRequestId(cause: unknown) {
  return typeof cause === "object" && cause !== null
    ? errorRequestIds.get(cause)
    : undefined;
}
