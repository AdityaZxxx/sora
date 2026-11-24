import type { Actor } from "@/lib/caller";
import type { Prisma, PrismaClient } from "@prisma/client";

import { PrismaPg } from "@prisma/adapter-pg";
import { EventEmitter } from "node:events";

import { revalidateHousehold } from "@/lib/cache";
import {
  HOUSEHOLD_EVENT_CHANNEL,
  householdChangeEffects,
  householdChangeSchema,
  type HouseholdChange,
  type HouseholdChangeResource,
} from "@/lib/household-change";
import prisma, { stripSslMode } from "@/lib/prisma";

type QueryExecutor = Prisma.TransactionClient | PrismaClient;

type PublishInput = {
  householdId: string;
  actor: Actor;
  resource: HouseholdChangeResource;
  message: string;
  recipientId?: string;
  executor?: QueryExecutor;
};

export async function publishHouseholdChange({
  householdId,
  actor,
  resource,
  message,
  recipientId,
  executor = prisma,
}: PublishInput) {
  const change = householdChangeSchema.parse({
    householdId,
    actorId: actor.actorId,
    resource,
    message: `${actor.actorName} ${message}`,
    at: new Date().toISOString(),
    ...(recipientId && { recipientId }),
  });

  await executor.$executeRaw`SELECT pg_notify(${HOUSEHOLD_EVENT_CHANNEL}, ${JSON.stringify(change)})`;
  revalidateHousehold(householdId, householdChangeEffects(resource).serverTags);
}

type HouseholdListener = {
  emitter: EventEmitter;
};

let listenerPromise: Promise<HouseholdListener> | undefined;

function listenerConnectionString() {
  const primary = process.env.POSTGRES_PRISMA_URL;
  const nonPooling = process.env.POSTGRES_URL_NON_POOLING;
  if (!primary || !nonPooling) {
    return nonPooling ?? primary;
  }
  try {
    return new URL(primary).pathname === new URL(nonPooling).pathname
      ? nonPooling
      : primary;
  } catch {
    return primary;
  }
}

function createListener(): Promise<HouseholdListener> {
  const adapter = new PrismaPg({
    connectionString: stripSslMode(listenerConnectionString()),
    ssl: { rejectUnauthorized: false },
  });
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0);

  return (async () => {
    const driverAdapter = await adapter.connect();
    const pool = driverAdapter.underlyingDriver();
    const client = await pool.connect();
    client.on("error", () => {
      listenerPromise = undefined;
      emitter.emit("disconnect");
      client.release(true);
      void pool.end().catch(() => {});
    });
    client.on("notification", (notification) => {
      if (
        notification.channel !== HOUSEHOLD_EVENT_CHANNEL ||
        !notification.payload
      ) {
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(notification.payload);
      } catch {
        return;
      }
      const change = householdChangeSchema.safeParse(parsed);
      if (change.success) {
        emitter.emit(change.data.householdId, change.data);
      }
    });
    await client.query(`LISTEN ${HOUSEHOLD_EVENT_CHANNEL}`);
    return { emitter };
  })();
}

function getListener() {
  listenerPromise ??= createListener().catch((cause) => {
    listenerPromise = undefined;
    throw cause;
  });
  return listenerPromise;
}

export async function subscribeToHouseholdChanges(
  householdId: string,
  onChange: (change: HouseholdChange) => void,
  onDisconnect: () => void,
) {
  const { emitter } = await getListener();
  emitter.on(householdId, onChange);
  emitter.on("disconnect", onDisconnect);
  return () => {
    emitter.off(householdId, onChange);
    emitter.off("disconnect", onDisconnect);
  };
}
