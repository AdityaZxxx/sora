import type { MemberBalance, SimplifiedTransfer } from "@/schemas/balances";

import { Prisma } from "@prisma/client";
import { cacheLife, cacheTag } from "next/cache";

import { CACHE_RESOURCE, walletTag } from "@/lib/cache";
import prisma from "@/lib/prisma";

const { Decimal } = Prisma;
const ZERO = new Decimal(0);

type BalanceEdgeRow = {
  creditorId: string;
  debtorId: string;
  amount: string;
};

type NetEdges = Map<string, Map<string, Prisma.Decimal>>;

async function loadBalanceEdges(walletId: string) {
  const [memberships, rows] = await Promise.all([
    prisma.walletMembership.findMany({
      where: {
        walletId,
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        joinedAt: "asc",
      },
    }),
    prisma.$queryRaw<BalanceEdgeRow[]>`
      WITH member_ids AS (
        SELECT "userId" AS id
        FROM "WalletMembership"
        WHERE "walletId" = ${walletId}
      ),
      member_count AS (
        SELECT COUNT(*)::integer AS n FROM member_ids
      ),
      shared_expenses AS (
        SELECT
          t.id,
          t."addedById" AS payer,
          t.amount,
          (
            SELECT COUNT(*)
            FROM "TransactionShare" s
            WHERE s."transactionId" = t.id
          ) AS share_count
        FROM "Transaction" t
        WHERE t."walletId" = ${walletId}
          AND t.type = 'expense'
      ),
      share_edges AS (
        SELECT e.payer AS creditor, s."userId" AS debtor, s.amount AS amount
        FROM shared_expenses e
        JOIN "TransactionShare" s ON s."transactionId" = e.id
        WHERE s."userId" <> e.payer
      ),
      even_edges AS (
        SELECT e.payer AS creditor, m.id AS debtor, e.amount / mc.n AS amount
        FROM shared_expenses e
        CROSS JOIN member_ids m
        CROSS JOIN member_count mc
        WHERE e.share_count = 0 AND mc.n > 0 AND m.id <> e.payer
      ),
      settlement_edges AS (
        SELECT
          s."payerId" AS creditor,
          s."receiverId" AS debtor,
          s.amount AS amount
        FROM "Settlement" s
        WHERE s."walletId" = ${walletId}
      ),
      edges AS (
        SELECT * FROM share_edges
        UNION ALL
        SELECT * FROM even_edges
        UNION ALL
        SELECT * FROM settlement_edges
      )
      SELECT
        e.creditor AS "creditorId",
        e.debtor AS "debtorId",
        SUM(e.amount)::text AS amount
      FROM edges e
      JOIN member_ids c ON c.id = e.creditor
      JOIN member_ids d ON d.id = e.debtor
      GROUP BY e.creditor, e.debtor
    `,
  ]);

  const edges: NetEdges = new Map();
  for (const row of rows) {
    const amount = new Decimal(row.amount);
    if (amount.isZero()) continue;

    let debtors = edges.get(row.creditorId);
    if (!debtors) {
      debtors = new Map();
      edges.set(row.creditorId, debtors);
    }
    debtors.set(row.debtorId, amount);
  }

  return { memberships, edges };
}

function edgeAmount(
  edges: NetEdges,
  creditorId: string,
  debtorId: string,
): Prisma.Decimal {
  return edges.get(creditorId)?.get(debtorId) ?? ZERO;
}

export async function getMemberBalances(
  walletId: string,
  callerId: string,
): Promise<MemberBalance[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(walletTag(walletId, CACHE_RESOURCE.balances));

  const { memberships, edges } = await loadBalanceEdges(walletId);

  return memberships
    .filter((membership) => membership.user.id !== callerId)
    .map((membership) => {
      const otherId = membership.user.id;
      const balance = edgeAmount(edges, otherId, callerId).minus(
        edgeAmount(edges, callerId, otherId),
      );

      return {
        userId: otherId,
        name: membership.user.name,
        balance: balance.toDecimalPlaces(2).toNumber(),
      };
    });
}

export async function getSimplifiedTransfers(
  walletId: string,
): Promise<SimplifiedTransfer[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(walletTag(walletId, CACHE_RESOURCE.balances));

  const { memberships, edges } = await loadBalanceEdges(walletId);

  const netReceivableByUserId = new Map<string, Prisma.Decimal>(
    memberships.map((membership) => [membership.user.id, new Decimal(0)]),
  );

  for (const [creditorId, debtors] of edges) {
    if (!netReceivableByUserId.has(creditorId)) continue;

    let creditorTotal = netReceivableByUserId.get(creditorId) ?? ZERO;
    for (const [debtorId, amount] of debtors) {
      if (!netReceivableByUserId.has(debtorId)) continue;

      creditorTotal = creditorTotal.plus(amount);
      netReceivableByUserId.set(
        debtorId,
        (netReceivableByUserId.get(debtorId) ?? ZERO).minus(amount),
      );
    }
    netReceivableByUserId.set(creditorId, creditorTotal);
  }

  const EPSILON = new Decimal("0.005");
  const creditors = memberships
    .map((membership) => ({
      id: membership.user.id,
      name: membership.user.name,
      amount: netReceivableByUserId.get(membership.user.id) ?? ZERO,
    }))
    .filter((member) => member.amount.gt(EPSILON))
    .toSorted((a, b) => b.amount.cmp(a.amount));
  const debtors = memberships
    .map((membership) => ({
      id: membership.user.id,
      name: membership.user.name,
      amount: netReceivableByUserId.get(membership.user.id) ?? ZERO,
    }))
    .filter((member) => member.amount.lt(-EPSILON))
    .toSorted((a, b) => a.amount.cmp(b.amount));

  const transfers: SimplifiedTransfer[] = [];
  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0];
    const debtor = debtors[0];
    const amount = creditor.amount.lt(debtor.amount.neg())
      ? creditor.amount
      : debtor.amount.neg();
    const rounded = amount.toDecimalPlaces(2);
    if (rounded.lte(0)) break;

    transfers.push({
      fromUserId: debtor.id,
      fromName: debtor.name,
      toUserId: creditor.id,
      toName: creditor.name,
      amount: rounded.toNumber(),
    });

    creditor.amount = creditor.amount.minus(rounded);
    debtor.amount = debtor.amount.plus(rounded);

    if (creditor.amount.lte(EPSILON)) creditors.shift();
    if (debtor.amount.neg().lte(EPSILON)) debtors.shift();
  }

  return transfers;
}
