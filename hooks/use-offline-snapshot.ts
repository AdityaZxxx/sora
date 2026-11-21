"use client";

import type { MemberBalance } from "@/schemas/balances";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useBalanceStats } from "@/hooks/use-balance-stats";
import { useHouseholds } from "@/hooks/use-households";
import { useSession } from "@/lib/auth-client";
import { DEFAULT_CURRENCY, QUERY_STALE_TIME } from "@/lib/constants";
import { resolveDateRange } from "@/lib/dates";
import { fetchReadJson } from "@/lib/fetch-json";
import { queryKeys } from "@/lib/query-keys";
import { MemberBalancesSchema } from "@/schemas/balances";

const SNAPSHOT_SCHEMA = 1;
const KEY_PREFIX = "sora:offline:snapshot:";
const ACTIVE_KEY = "sora:offline:active";
const CLEAR_COOKIE = "sora_clear_offline";

type OfflineSnapshot = {
  schema: number;
  householdId: string;
  savedAt: number;
  currency: string;
  stats: { income: number; expense: number; net: number };
  balances: { name: string; balance: number }[];
};

function storeValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}

export function clearOfflineSnapshot() {
  try {
    const storage = window.localStorage;
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && key.startsWith(KEY_PREFIX)) {
        keys.push(key);
      }
    }
    for (const key of keys) {
      storage.removeItem(key);
    }
    storage.removeItem(ACTIVE_KEY);
  } catch {
    return;
  }
}

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return isOnline;
}

export function useOfflineSnapshot() {
  const isOnline = useOnlineStatus();
  const { data: households } = useHouseholds();
  const { data: session } = useSession();
  const [range] = useState(() => resolveDateRange());

  const householdId = households?.active.id;
  const currency =
    households?.households.find((household) => household.id === householdId)
      ?.currency ?? DEFAULT_CURRENCY;

  const { data: balances, isFetching: balancesFetching } = useQuery<
    MemberBalance[]
  >({
    queryKey: queryKeys.balances,
    queryFn: () =>
      fetchReadJson("/api/balances", "Failed to fetch balances", {
        schema: MemberBalancesSchema,
      }),
    staleTime: QUERY_STALE_TIME,
  });

  const { data: stats, isFetching: statsFetching } = useBalanceStats(
    range.from,
    range.to,
  );

  const activeHousehold = useRef<string | undefined>(undefined);

  useEffect(() => {
    const marked = document.cookie
      .split("; ")
      .some((part) => part === `${CLEAR_COOKIE}=1`);
    if (!marked) return;

    clearOfflineSnapshot();
    document.cookie = `${CLEAR_COOKIE}=; path=/; max-age=0`;
  }, []);

  useEffect(() => {
    if (!householdId) return;
    const previous = activeHousehold.current;
    activeHousehold.current = householdId;
    if (previous !== undefined && previous !== householdId) {
      clearOfflineSnapshot();
    }
  }, [householdId]);

  useEffect(() => {
    if (session === null && isOnline) {
      clearOfflineSnapshot();
    }
  }, [session, isOnline]);

  useEffect(() => {
    if (
      !householdId ||
      !balances ||
      !stats ||
      !isOnline ||
      balancesFetching ||
      statsFetching
    ) {
      return;
    }

    const snapshot: OfflineSnapshot = {
      schema: SNAPSHOT_SCHEMA,
      householdId,
      savedAt: Date.now(),
      currency,
      stats: {
        income: stats.income,
        expense: stats.expense,
        net: stats.net,
      },
      balances: balances.map(({ name, balance }) => ({ name, balance })),
    };

    storeValue(KEY_PREFIX + householdId, JSON.stringify(snapshot));
    storeValue(ACTIVE_KEY, householdId);
  }, [
    householdId,
    currency,
    balances,
    stats,
    isOnline,
    balancesFetching,
    statsFetching,
  ]);

  return { isOnline };
}
