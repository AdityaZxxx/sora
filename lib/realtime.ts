import type { Actor } from "@/lib/caller";

import { PrismaPg } from "@prisma/adapter-pg";
import { EventEmitter } from "node:events";

import { revalidateUserApiTokens, revalidateWallet } from "@/lib/cache";
import { logWarn } from "@/lib/log";
import prisma, { stripSslMode } from "@/lib/prisma";
import {
  WALLET_EVENT_CHANNEL,
  walletChangeEffects,
  walletChangeSchema,
  type WalletChange,
  type WalletChangeEffects,
  type WalletChangeResource,
  type WalletChangeScope,
} from "@/lib/wallet-change";

type PublishInput = {
  walletId: string;
  actor: Actor;
  resource: WalletChangeResource;
  message: string;
  recipientId?: string;
  scope?: WalletChangeScope;
};

function revalidateEffects(walletId: string, effects: WalletChangeEffects) {
  revalidateWallet(walletId, effects.serverTags);
}

function runRevalidation(run: () => void) {
  try {
    run();
  } catch (cause) {
    logWarn("revalidation.failed", {
      error: cause instanceof Error ? cause.message : String(cause),
    });
  }
}

function buildWalletChange({
  walletId,
  actor,
  resource,
  message,
  recipientId,
  scope,
}: PublishInput) {
  const effects = walletChangeEffects(resource, scope);
  const change = walletChangeSchema.parse({
    walletId,
    actorId: actor.actorId,
    resource,
    message: `${actor.actorName} ${message}`,
    at: new Date().toISOString(),
    ...(recipientId && { recipientId }),
    ...(scope && { scope }),
  });

  return { change, effects, walletId };
}

export async function publishWalletChange(input: PublishInput) {
  const { change, effects, walletId } = buildWalletChange(input);

  runRevalidation(() => revalidateEffects(walletId, effects));
  await prisma.$executeRaw`SELECT pg_notify(${WALLET_EVENT_CHANNEL}, ${JSON.stringify(change)})`;
}

export function invalidateUserApiTokens(userId: string) {
  runRevalidation(() => revalidateUserApiTokens(userId));
}

type WalletListener = {
  emitter: EventEmitter;
};

let listenerPromise: Promise<WalletListener> | undefined;

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

function createListener(): Promise<WalletListener> {
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
        notification.channel !== WALLET_EVENT_CHANNEL ||
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
      const change = walletChangeSchema.safeParse(parsed);
      if (change.success) {
        emitter.emit(change.data.walletId, change.data);
      }
    });
    await client.query(`LISTEN ${WALLET_EVENT_CHANNEL}`);
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

export async function subscribeToWalletChanges(
  walletId: string,
  onChange: (change: WalletChange) => void,
  onDisconnect: () => void,
) {
  const { emitter } = await getListener();
  emitter.on(walletId, onChange);
  emitter.on("disconnect", onDisconnect);
  return () => {
    emitter.off(walletId, onChange);
    emitter.off("disconnect", onDisconnect);
  };
}
