"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { useSession } from "@/lib/auth-client";
import {
  HOUSEHOLD_EVENTS_ENDPOINT,
  householdChangeEffects,
  householdChangeSchema,
} from "@/lib/household-change";

export function useHouseholdEvents() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();
  const viewerId = session?.user.id;

  useEffect(() => {
    if (!viewerId) {
      return;
    }

    const source = new EventSource(HOUSEHOLD_EVENTS_ENDPOINT);

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
      if (change.recipientId && change.recipientId !== viewerId) {
        return;
      }
      if (
        change.resource !== "notifications" &&
        change.actorId &&
        change.actorId !== viewerId
      ) {
        toast(change.message);
      }
      for (const queryKey of householdChangeEffects(
        change.resource,
        change.scope,
      ).clientKeys) {
        void queryClient.invalidateQueries({ queryKey });
      }
      router.refresh();
    });

    return () => source.close();
  }, [queryClient, router, viewerId]);
}
