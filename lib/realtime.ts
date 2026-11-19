import type { Prisma, PrismaClient } from "@prisma/client";

import { PrismaPg } from "@prisma/adapter-pg";
import { EventEmitter } from "node:events";

import { getSession } from "@/lib/auth";
import {
  HOUSEHOLD_EVENT_CHANNEL,
  householdChangeSchema,
  type HouseholdChange,
  type HouseholdChangeResource,
} from "@/lib/household-events";
import prisma, { stripSslMode } from "@/lib/prisma";

type QueryExecutor = Prisma.TransactionClient | PrismaClient;

type PublishInput = {
  householdId: string;
  resource: HouseholdChangeResource;
  message: string;
  executor?: QueryExecutor;
};

export async function publishHouseholdChange({
  householdId,
  resource,
  message,
  executor = prisma,
}: PublishInput) {
  const session = await getSession();
  const change = householdChangeSchema.parse({
    householdId,
    actorId: session?.user.id ?? "",
    resource,
    message: `${session?.user.name ?? "A member"} ${message}`,
    at: new Date().toISOString(),
  });

  await executor.$executeRaw`SELECT pg_notify(${HOUSEHOLD_EVENT_CHANNEL}, ${JSON.stringify(change)})`;
}

export async function hasHouseholdMembership(
  householdId: string,
  userId: string,
) {
  const membership = await prisma.householdMembership.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    select: {
      householdId: true,
    },
  });
  return membership !== null;
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
