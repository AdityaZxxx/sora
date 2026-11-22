"use client";

import type { MutationClient } from "@/lib/offline-write-queue";

import { CreateTransaction } from "@/app/(dashboard)/_actions/transaction";
import { createMutationClient } from "@/lib/offline-write-queue";

let client: MutationClient | undefined;

export function getMutationClient(): MutationClient {
  client ??= createMutationClient({
    dispatch: (mutation) => CreateTransaction(mutation.payload),
    isOnline: () => navigator.onLine,
    now: () => Date.now(),
    fetch: (input, init) => fetch(input, init),
    probeUrl: "/offline.html",
  });
  return client;
}
