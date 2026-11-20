"use client";

import type { QueuedWrite } from "@/lib/offline-write-queue";

import { useSyncExternalStore } from "react";

import {
  listWrites,
  replayWrites,
  WRITE_QUEUE_CHANGE_EVENT,
} from "@/lib/offline-write-queue";

const EMPTY: QueuedWrite[] = [];
let snapshot: QueuedWrite[] = EMPTY;

function subscribe(onStoreChange: () => void) {
  const update = () => {
    void listWrites().then((writes) => {
      snapshot = writes;
      onStoreChange();
      return undefined;
    });
  };
  window.addEventListener(WRITE_QUEUE_CHANGE_EVENT, update);
  update();
  return () => window.removeEventListener(WRITE_QUEUE_CHANGE_EVENT, update);
}

async function retry() {
  return replayWrites();
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return EMPTY;
}

export function usePendingSync() {
  const writes = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const pending = writes.filter((write) => write.status === "pending");
  const failed = writes.filter((write) => write.status === "failed");

  return { pending, failed, retry };
}
