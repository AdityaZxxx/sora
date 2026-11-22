"use client";

import type { ActionResult } from "@/lib/action-result";
import type { Mutation } from "@/lib/mutation";

import { unwrapAction } from "@/lib/action-client";

const DB_NAME = "sora-offline-writes";
const DB_VERSION = 1;
const STORE = "writes";

export const WRITE_QUEUE_CHANGE_EVENT = "sora:write-queue-change";

export type QueuedWrite = {
  id: string;
  mutation: Mutation;
  createdAt: number;
  status: "pending" | "failed";
  error?: string;
};

export type MutationClientDeps = {
  dispatch: (mutation: Mutation) => Promise<ActionResult>;
  isOnline: () => boolean;
  now: () => number;
  fetch: typeof globalThis.fetch;
  probeUrl: string;
};

export type MutationClient = {
  submit(mutation: Mutation): Promise<ActionResult>;
  replay(): Promise<{ synced: number; failed: number }>;
  dispose(): void;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = run(transaction.objectStore(STORE));
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
    });
  } finally {
    db.close();
  }
}

function notifyChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WRITE_QUEUE_CHANGE_EVENT));
  }
}

export async function listWrites(): Promise<QueuedWrite[]> {
  try {
    const writes = await withStore("readonly", (store) => store.getAll());
    return writes.toSorted((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

async function putWrite(write: QueuedWrite) {
  await withStore("readwrite", (store) => store.put(write));
}

async function removeWrite(id: string) {
  await withStore("readwrite", (store) => store.delete(id));
}

async function markFailed(id: string, error: string) {
  const writes = await listWrites();
  const write = writes.find((item) => item.id === id);
  if (write) {
    await putWrite({ ...write, status: "failed", error });
  }
}

function errorMessage(cause: unknown) {
  return cause instanceof Error && cause.message
    ? cause.message
    : "The connection dropped before the change could sync.";
}

export function createMutationClient(deps: MutationClientDeps): MutationClient {
  const cancelWaits = new Set<() => void>();

  function waitForConnection() {
    return new Promise<void>((resolve, reject) => {
      let timer: ReturnType<typeof setInterval>;
      let done = false;
      const cleanup = () => {
        clearInterval(timer);
        window.removeEventListener("online", finish);
        cancelWaits.delete(cancel);
      };
      const finish = () => {
        if (done) return;
        done = true;
        cleanup();
        resolve();
      };
      const cancel = () => {
        if (done) return;
        done = true;
        cleanup();
        reject(new Error("Sync paused because the app closed."));
      };
      cancelWaits.add(cancel);
      window.addEventListener("online", finish);
      timer = setInterval(() => {
        void deps
          .fetch(`${deps.probeUrl}?probe=${deps.now()}`, {
            method: "HEAD",
            cache: "no-store",
          })
          .then((response) => {
            if (response.ok) finish();
            return undefined;
          })
          .catch(() => undefined);
      }, 2000);
    });
  }

  async function submit(mutation: Mutation) {
    if (deps.isOnline()) {
      try {
        return await deps.dispatch(mutation);
      } catch (cause) {
        if (deps.isOnline() && !(cause instanceof TypeError)) throw cause;
      }
    }

    const write: QueuedWrite = {
      id: mutation.idempotencyKey,
      mutation,
      createdAt: deps.now(),
      status: "pending",
    };
    await putWrite(write);
    notifyChange();

    try {
      await waitForConnection();
      const result = await deps.dispatch(mutation);
      unwrapAction(result);
      await removeWrite(write.id);
      notifyChange();
      return result;
    } catch (cause) {
      await markFailed(write.id, errorMessage(cause));
      notifyChange();
      throw cause;
    }
  }

  async function replay() {
    const writes = await listWrites();
    let synced = 0;
    let failed = 0;

    for (const write of writes) {
      try {
        unwrapAction(await deps.dispatch(write.mutation));
        await removeWrite(write.id);
        synced += 1;
      } catch (cause) {
        await markFailed(write.id, errorMessage(cause));
        failed += 1;
      }
    }

    notifyChange();
    return { synced, failed };
  }

  function dispose() {
    for (const cancel of cancelWaits) cancel();
  }

  return { submit, replay, dispose };
}
