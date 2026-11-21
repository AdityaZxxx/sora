"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useSession } from "@/lib/auth-client";
import {
  eventSourceReadySchema,
  HOUSEHOLD_EVENTS_ENDPOINT,
  householdChangeEffects,
  householdChangeSchema,
} from "@/lib/household-change";

export function useHouseholdEvents() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const viewerId = useRef<string | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (!session) {
      return;
    }

    const source = new EventSource(HOUSEHOLD_EVENTS_ENDPOINT);

    source.addEventListener("ready", (event) => {
      let data: unknown;
      try {
        data = JSON.parse((event as MessageEvent<string>).data);
      } catch {
        return;
      }
      const parsed = eventSourceReadySchema.safeParse(data);
      if (parsed.success) {
        viewerId.current = parsed.data.viewerId;
      }
    });

    source.addEventListener("message", (event) => {
      let data: unknown;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      const parsed = householdChangeSchema.safeParse(data);
      if (!parsed.success) {
        return;
      }

      const change = parsed.data;
      if (
        change.resource !== "notifications" &&
        change.actorId &&
        change.actorId !== viewerId.current
      ) {
        toast(change.message);
      }
      for (const queryKey of householdChangeEffects(change.resource)
        .clientKeys) {
        void queryClient.invalidateQueries({ queryKey });
      }
      router.refresh();
    });

    return () => source.close();
  }, [queryClient, router, session]);
}
