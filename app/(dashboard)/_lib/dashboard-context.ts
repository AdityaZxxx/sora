import type { Period, Timeframe } from "@/lib/types";

import { cacheLife } from "next/cache";

import { VIEW_ONLY_ROLE } from "@/lib/constants";
import { resolveDateRange } from "@/lib/dates";
import { countWalletMembers, requireWallet } from "@/lib/wallet";

export type DashboardView = {
  dateRange: { from: Date; to: Date };
  historyView: { timeframe: Timeframe; period: Period };
};

export type DashboardContext = DashboardView & {
  walletId: string;
  currency: string;
  userId: string;
  userName: string;
  memberCount: number;
  canEdit: boolean;
};

function resolveDashboardView(): DashboardView {
  const dateRange = resolveDateRange();
  return {
    dateRange,
    historyView: {
      timeframe: "month",
      period: {
        month: dateRange.to.getUTCMonth(),
        year: dateRange.to.getUTCFullYear(),
      },
    },
  };
}

export async function getDashboardContext(): Promise<DashboardContext | null> {
  "use cache: private";
  cacheLife({ stale: 300 });

  const result = await requireWallet();
  const currency = result?.wallet.currency;
  if (!result || !currency) {
    return null;
  }

  return {
    walletId: result.wallet.id,
    currency,
    userId: result.session.user.id,
    userName: result.session.user.name,
    memberCount: await countWalletMembers(result.wallet.id),
    canEdit: result.membership.role !== VIEW_ONLY_ROLE,
    ...resolveDashboardView(),
  };
}
