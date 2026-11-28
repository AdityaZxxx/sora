-- Data-preserving, idempotent wallet-scope migration.
--
-- Production had already applied part of an earlier version of this migration
-- before it failed, so every statement here is safe to repeat. The migration
-- works from a clean pre-wallet schema and from a half-applied one.
--
-- Preserved: Wallet <- Household; WalletMembership <- HouseholdMembership;
-- walletId <- householdId on every money record; existing TransactionShare
-- rows stay untouched. A previously failed attempt left no settlement
-- transactions, split shares, goal tags or API tokens to reconstruct.

-- ---------------------------------------------------------------------------
-- 1. Old settlement trigger/function.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS "Transaction_set_settlement_counterparty_id" ON "Transaction";
DROP FUNCTION IF EXISTS public.set_settlement_counterparty_id();
DROP FUNCTION IF EXISTS public.resolve_settlement_counterparty_id();

-- ---------------------------------------------------------------------------
-- 2. New tables, created before any data is copied.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Wallet" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "currency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WalletMembership" (
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailDigest" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'member',
    CONSTRAINT "WalletMembership_pkey" PRIMARY KEY ("walletId", "userId")
);

CREATE TABLE IF NOT EXISTS "Settlement" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "addedVia" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Wallet" ("id", "name", "currency", "createdAt", "updatedAt", "agentAccessEnabled")
SELECT "id", "name", "currency", "createdAt", "updatedAt", "agentAccessEnabled" FROM "Household"
ON CONFLICT DO NOTHING;

INSERT INTO "WalletMembership" ("walletId", "userId", "joinedAt", "emailDigest", "role")
SELECT "householdId", "userId", "joinedAt", "emailDigest", "role" FROM "HouseholdMembership"
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Old foreign keys and indexes, if still present.
-- ---------------------------------------------------------------------------
ALTER TABLE "ApiToken" DROP CONSTRAINT IF EXISTS "ApiToken_householdId_fkey";
ALTER TABLE "Budget" DROP CONSTRAINT IF EXISTS "Budget_householdId_fkey";
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_householdId_fkey";
ALTER TABLE "Goal" DROP CONSTRAINT IF EXISTS "Goal_householdId_fkey";
ALTER TABLE "HouseholdMembership" DROP CONSTRAINT IF EXISTS "HouseholdMembership_householdId_fkey";
ALTER TABLE "HouseholdMembership" DROP CONSTRAINT IF EXISTS "HouseholdMembership_userId_fkey";
ALTER TABLE "InviteLink" DROP CONSTRAINT IF EXISTS "InviteLink_householdId_fkey";
ALTER TABLE "MonthHistory" DROP CONSTRAINT IF EXISTS "MonthHistory_householdId_fkey";
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_householdId_fkey";
ALTER TABLE "RecurringItem" DROP CONSTRAINT IF EXISTS "RecurringItem_householdId_fkey";
ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_counterpartyId_fkey";
ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_householdId_fkey";
ALTER TABLE "YearHistory" DROP CONSTRAINT IF EXISTS "YearHistory_householdId_fkey";

DROP INDEX IF EXISTS "ApiToken_householdId_idx";
DROP INDEX IF EXISTS "Budget_householdId_category_key";
DROP INDEX IF EXISTS "Category_householdId_type_idx";
DROP INDEX IF EXISTS "Category_name_householdId_type_key";
DROP INDEX IF EXISTS "Notification_householdId_userId_createdAt_idx";
DROP INDEX IF EXISTS "RecurringItem_householdId_idx";
DROP INDEX IF EXISTS "Transaction_householdId_date_idx";
DROP INDEX IF EXISTS "Transaction_householdId_goalId_idx";
DROP INDEX IF EXISTS "Transaction_householdId_shared_type_idx";
DROP INDEX IF EXISTS "ApiToken_walletId_idx";
DROP INDEX IF EXISTS "Budget_walletId_category_key";
DROP INDEX IF EXISTS "Category_walletId_type_idx";
DROP INDEX IF EXISTS "Category_name_walletId_type_key";
DROP INDEX IF EXISTS "Notification_walletId_userId_createdAt_idx";
DROP INDEX IF EXISTS "RecurringItem_walletId_idx";
DROP INDEX IF EXISTS "Transaction_walletId_date_idx";
DROP INDEX IF EXISTS "Transaction_walletId_type_idx";
DROP INDEX IF EXISTS "Transaction_walletId_goalId_idx";
DROP INDEX IF EXISTS "WalletMembership_userId_idx";
DROP INDEX IF EXISTS "Settlement_walletId_date_idx";

-- ---------------------------------------------------------------------------
-- 4. householdId -> walletId on each money record, only if still present.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ApiToken','Budget','Category','Goal','InviteLink','Notification','RecurringItem','Transaction'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'householdId'
    ) THEN
      EXECUTE format('ALTER TABLE %I RENAME COLUMN "householdId" TO "walletId"', t);
    END IF;
  END LOOP;
END $$;

ALTER TABLE "Category" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- Composite primary keys: rebuild on the renamed column.
ALTER TABLE "MonthHistory" DROP CONSTRAINT IF EXISTS "MonthHistory_pkey";
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='MonthHistory' AND column_name='householdId'
  ) THEN
    ALTER TABLE "MonthHistory" RENAME COLUMN "householdId" TO "walletId";
  END IF;
END $$;
ALTER TABLE "MonthHistory" ADD CONSTRAINT "MonthHistory_pkey" PRIMARY KEY ("walletId","day","month","year");

ALTER TABLE "YearHistory" DROP CONSTRAINT IF EXISTS "YearHistory_pkey";
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='YearHistory' AND column_name='householdId'
  ) THEN
    ALTER TABLE "YearHistory" RENAME COLUMN "householdId" TO "walletId";
  END IF;
END $$;
ALTER TABLE "YearHistory" ADD CONSTRAINT "YearHistory_pkey" PRIMARY KEY ("walletId","month","year");

-- Old settlement representation on Transaction. Verified empty on production.
ALTER TABLE "Transaction" DROP COLUMN IF EXISTS "counterpartyId";
ALTER TABLE "Transaction" DROP COLUMN IF EXISTS "shared";

-- Household tables: data already copied above.
DROP TABLE IF EXISTS "Household", "HouseholdMembership";

-- ---------------------------------------------------------------------------
-- 5. Indexes and foreign keys on walletId.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "ApiToken_walletId_idx" ON "ApiToken"("walletId");
CREATE UNIQUE INDEX IF NOT EXISTS "Budget_walletId_category_key" ON "Budget"("walletId", "category");
CREATE INDEX IF NOT EXISTS "Category_walletId_type_idx" ON "Category"("walletId", "type");
CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_walletId_type_key" ON "Category"("name", "walletId", "type");
CREATE INDEX IF NOT EXISTS "Notification_walletId_userId_createdAt_idx" ON "Notification"("walletId", "userId", "createdAt");
CREATE INDEX IF NOT EXISTS "RecurringItem_walletId_idx" ON "RecurringItem"("walletId");
CREATE INDEX IF NOT EXISTS "Transaction_walletId_date_idx" ON "Transaction"("walletId", "date");
CREATE INDEX IF NOT EXISTS "Transaction_walletId_type_idx" ON "Transaction"("walletId", "type");
CREATE INDEX IF NOT EXISTS "Transaction_walletId_goalId_idx" ON "Transaction"("walletId", "goalId");
CREATE INDEX IF NOT EXISTS "WalletMembership_userId_idx" ON "WalletMembership"("userId");
CREATE INDEX IF NOT EXISTS "Settlement_walletId_date_idx" ON "Settlement"("walletId", "date");

ALTER TABLE "WalletMembership" DROP CONSTRAINT IF EXISTS "WalletMembership_walletId_fkey";
ALTER TABLE "WalletMembership" ADD CONSTRAINT "WalletMembership_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletMembership" DROP CONSTRAINT IF EXISTS "WalletMembership_userId_fkey";
ALTER TABLE "WalletMembership" ADD CONSTRAINT "WalletMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InviteLink" DROP CONSTRAINT IF EXISTS "InviteLink_walletId_fkey";
ALTER TABLE "InviteLink" ADD CONSTRAINT "InviteLink_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiToken" DROP CONSTRAINT IF EXISTS "ApiToken_walletId_fkey";
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_walletId_fkey";
ALTER TABLE "Category" ADD CONSTRAINT "Category_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_walletId_fkey";
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Settlement" DROP CONSTRAINT IF EXISTS "Settlement_walletId_fkey";
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Settlement" DROP CONSTRAINT IF EXISTS "Settlement_payerId_fkey";
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Settlement" DROP CONSTRAINT IF EXISTS "Settlement_receiverId_fkey";
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringItem" DROP CONSTRAINT IF EXISTS "RecurringItem_walletId_fkey";
ALTER TABLE "RecurringItem" ADD CONSTRAINT "RecurringItem_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Goal" DROP CONSTRAINT IF EXISTS "Goal_walletId_fkey";
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonthHistory" DROP CONSTRAINT IF EXISTS "MonthHistory_walletId_fkey";
ALTER TABLE "MonthHistory" ADD CONSTRAINT "MonthHistory_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "YearHistory" DROP CONSTRAINT IF EXISTS "YearHistory_walletId_fkey";
ALTER TABLE "YearHistory" ADD CONSTRAINT "YearHistory_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Budget" DROP CONSTRAINT IF EXISTS "Budget_walletId_fkey";
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_walletId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
