"use client";

const DB_NAME = "sora-offline-writes";
const DB_VERSION = 1;
const STORE = "writes";

const ACTION_HEADER = "next-action";
const IDEMPOTENCY_HEADER = "x-sora-idempotency-key";
export const WRITE_QUEUE_CHANGE_EVENT = "sora:write-queue-change";

const TRANSACTION_MARKERS = [
  '"amount"',
  '"category"',
  '"date"',
  '"shared"',
  '"type"',
];

export type QueuedWrite = {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  description: string;
  amount: number;
  createdAt: number;
  status: "pending" | "failed";
  error?: string;
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

let installed = false;
let originalFetch: typeof window.fetch | null = null;
let patchedFetch: typeof window.fetch | null = null;
let replayFetch: typeof window.fetch | null = null;
const cancelWaits = new Set<() => void>();

function fetchForReplay(): typeof window.fetch {
  return replayFetch ?? window.fetch.bind(window);
}

async function assertSynced(response: Response) {
  if (!response.ok) {
    throw new Error(`Sync failed with status ${response.status}`);
  }
  const payload = await response.clone().text();
  if (payload.includes('"ok":false')) {
    throw new Error("The server rejected this change when it synced.");
  }
}

function isTransactionCreate(body: string, headers: Headers) {
  return (
    headers.has(ACTION_HEADER) &&
    TRANSACTION_MARKERS.every((marker) => body.includes(marker))
  );
}

function withIdempotencyKey(body: string, key: string) {
  try {
    const parsed: unknown = JSON.parse(body);
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      typeof parsed[0] === "object" &&
      parsed[0] !== null
    ) {
      return JSON.stringify([
        { ...parsed[0], idempotencyKey: key },
        ...parsed.slice(1),
      ]);
    }
  } catch {
    return body;
  }
  return body;
}

function parseSummary(body: string) {
  try {
    const parsed: unknown = JSON.parse(body);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const form = parsed[0] as { description?: unknown; amount?: unknown };
      return {
        description:
          typeof form.description === "string" && form.description
            ? form.description
            : "Transaction",
        amount: typeof form.amount === "number" ? form.amount : 0,
      };
    }
  } catch {
    return null;
  }
  return null;
}

function errorMessage(cause: unknown) {
  return cause instanceof Error && cause.message
    ? cause.message
    : "The connection dropped before the change could sync.";
}

function waitForConnection() {
  return new Promise<void>((resolve, reject) => {
    let timer: ReturnType<typeof setInterval>;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(timer);
      window.removeEventListener("online", finish);
      cancelWaits.delete(cancel);
      resolve();
    };
    const cancel = () => {
      if (done) return;
      done = true;
      clearInterval(timer);
      window.removeEventListener("online", finish);
      cancelWaits.delete(cancel);
      reject(new Error("Sync paused because the app closed."));
    };
    cancelWaits.add(cancel);
    window.addEventListener("online", finish);
    timer = setInterval(() => {
      void fetchForReplay()(`/offline.html?probe=${Date.now()}`, {
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

export function installWriteInterceptor() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  originalFetch = window.fetch.bind(window);
  replayFetch = originalFetch;
  const fetchDirect = originalFetch;

  const interceptor: typeof window.fetch = async (input, init) => {
    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    if (method !== "POST" || !init || typeof init.body !== "string") {
      return fetchDirect(input, init);
    }

    const headers = new Headers(
      init.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    if (!isTransactionCreate(init.body, headers)) {
      return fetchDirect(input, init);
    }

    const idempotencyKey = crypto.randomUUID();
    headers.set(IDEMPOTENCY_HEADER, idempotencyKey);
    const body = withIdempotencyKey(init.body, idempotencyKey);
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const summary = parseSummary(body) ?? {
      description: "Transaction",
      amount: 0,
    };

    if (navigator.onLine) {
      try {
        return await fetchDirect(input, { ...init, headers, body });
      } catch (cause) {
        if (!(cause instanceof TypeError)) throw cause;
      }
    }

    const write: QueuedWrite = {
      id: idempotencyKey,
      url,
      method,
      headers: Object.fromEntries(headers.entries()),
      body,
      description: summary.description,
      amount: summary.amount,
      createdAt: Date.now(),
      status: "pending",
    };
    await putWrite(write);
    notifyChange();

    try {
      await waitForConnection();
      const response = await fetchDirect(url, {
        method,
        headers: write.headers,
        body: write.body,
      });
      await assertSynced(response);
      await removeWrite(idempotencyKey);
      notifyChange();
      return response;
    } catch (cause) {
      await markFailed(idempotencyKey, errorMessage(cause));
      notifyChange();
      throw cause;
    }
  };

  patchedFetch = interceptor;
  window.fetch = interceptor;
}

export function uninstallWriteInterceptor() {
  if (!installed || typeof window === "undefined") return;
  installed = false;
  for (const cancel of cancelWaits) cancel();
  if (window.fetch === patchedFetch && originalFetch) {
    window.fetch = originalFetch;
  }
  patchedFetch = null;
  originalFetch = null;
  replayFetch = null;
}

export async function replayWrites() {
  const writes = await listWrites();
  let synced = 0;
  let failed = 0;

  for (const write of writes) {
    try {
      const response = await fetchForReplay()(write.url, {
        method: write.method,
        headers: write.headers,
        body: write.body,
      });
      await assertSynced(response);
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
