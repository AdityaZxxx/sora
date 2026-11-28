-- Data-preserving wallet-scope migration.
-- Replaces the earlier destructive version. Production has populated tables;
-- every old row is copied before any column/table is removed. NOT NULL is set
-- only after backfill. Order respects foreign keys.
--
-- Preserved: Wallet <- Household; WalletMembership <- HouseholdMembership;
-- walletId <- householdId on ApiToken, Budget, Category, Goal, InviteLink,
-- MonthHistory, Notification, RecurringItem, Transaction, YearHistory;
-- existing TransactionShare rows are untouched.
-- NOT reconstructed here (needs production data review): old settlement
-- Transactions are not copied into the new Settlement table, and
-- Transaction.shared is dropped; verify on a snapshot copy before relying on it.

-- ---------------------------------------------------------------------------
-- 1. Drop old settlement trigger/function (reads columns removed below).
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS "Transaction_set_settlement_counterparty_id" ON "Transaction";
DROP FUNCTION IF EXISTS public.set_settlement_counterparty_id();
DROP FUNCTION IF EXISTS public.resolve_settlement_counterparty_id();

-- ---------------------------------------------------------------------------
-- 2. Create new tables FIRST so we can populate them before re-pointing FKs.
-- ---------------------------------------------------------------------------
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "currency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletMembership" (
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailDigest" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'member',
    CONSTRAINT "WalletMembership_pkey" PRIMARY KEY ("walletId", "userId")
);

CREATE TABLE "Settlement" (
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

-- Copy existing households -> wallets (keep ids so householdId still resolves).
INSERT INTO "Wallet" ("id", "name", "currency", "createdAt", "updatedAt", "agentAccessEnabled")
SELECT "id", "name", "currency", "createdAt", "updatedAt", "agentAccessEnabled" FROM "Household";

INSERT INTO "WalletMembership" ("walletId", "userId", "joinedAt", "emailDigest", "role")
SELECT "householdId", "userId", "joinedAt", "emailDigest", "role" FROM "HouseholdMembership";

-- ---------------------------------------------------------------------------
-- 3. Drop old foreign keys (so columns can be renamed / tables dropped).
-- ---------------------------------------------------------------------------
ALTER TABLE "ApiToken" DROP CONSTRAINT "ApiToken_householdId_fkey";
ALTER TABLE "Budget" DROP CONSTRAINT "Budget_householdId_fkey";
ALTER TABLE "Category" DROP CONSTRAINT "Category_householdId_fkey";
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_householdId_fkey";
ALTER TABLE "HouseholdMembership" DROP CONSTRAINT "HouseholdMembership_householdId_fkey";
ALTER TABLE "HouseholdMembership" DROP CONSTRAINT "HouseholdMembership_userId_fkey";
ALTER TABLE "InviteLink" DROP CONSTRAINT "InviteLink_householdId_fkey";
ALTER TABLE "MonthHistory" DROP CONSTRAINT "MonthHistory_householdId_fkey";
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_householdId_fkey";
ALTER TABLE "RecurringItem" DROP CONSTRAINT "RecurringItem_householdId_fkey";
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_counterpartyId_fkey";
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_householdId_fkey";
ALTER TABLE "YearHistory" DROP CONSTRAINT "YearHistory_householdId_fkey";

-- ---------------------------------------------------------------------------
-- 4. Drop old indexes that reference householdId.
-- ---------------------------------------------------------------------------
DROP INDEX "ApiToken_householdId_idx";
DROP INDEX "Budget_householdId_category_key";
DROP INDEX "Category_householdId_type_idx";
DROP INDEX "Category_name_householdId_type_key";
DROP INDEX "Notification_householdId_userId_createdAt_idx";
DROP INDEX "RecurringItem_householdId_idx";
DROP INDEX "Transaction_householdId_date_idx";
DROP INDEX "Transaction_householdId_goalId_idx";
DROP INDEX "Transaction_householdId_shared_type_idx";

-- ---------------------------------------------------------------------------
-- 5. householdId -> walletId: rename (keeps values + NOT NULL), no data lost.
--    Recreate primary keys / unique indexes on the renamed column.
-- ---------------------------------------------------------------------------
ALTER TABLE "ApiToken" RENAME COLUMN "householdId" TO "walletId";
ALTER TABLE "Budget" RENAME COLUMN "householdId" TO "walletId";
ALTER TABLE "Category" RENAME COLUMN "householdId" TO "walletId";
ALTER TABLE "Goal" RENAME COLUMN "householdId" TO "walletId";
ALTER TABLE "InviteLink" RENAME COLUMN "householdId" TO "walletId";
ALTER TABLE "Notification" RENAME COLUMN "householdId" TO "walletId";
ALTER TABLE "RecurringItem" RENAME COLUMN "householdId" TO "walletId";
ALTER TABLE "Transaction" RENAME COLUMN "householdId" TO "walletId";

-- Category default id parity with target schema.
ALTER TABLE "Category" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- MonthHistory / YearHistory: rename inside composite PK.
ALTER TABLE "MonthHistory" DROP CONSTRAINT "MonthHistory_pkey";
ALTER TABLE "MonthHistory" RENAME COLUMN "householdId" TO "walletId";
ALTER TABLE "MonthHistory" ADD CONSTRAINT "MonthHistory_pkey" PRIMARY KEY ("walletId", "day", "month", "year");

ALTER TABLE "YearHistory" DROP CONSTRAINT "YearHistory_pkey";
ALTER TABLE "YearHistory" RENAME COLUMN "householdId" TO "walletId";
ALTER TABLE "YearHistory" ADD CONSTRAINT "YearHistory_pkey" PRIMARY KEY ("walletId", "month", "year");

-- ---------------------------------------------------------------------------
-- 6. Transaction: drop old settlement representation. See note at top.
-- ---------------------------------------------------------------------------
ALTER TABLE "Transaction" DROP COLUMN "counterpartyId";
ALTER TABLE "Transaction" DROP COLUMN "shared";

-- ---------------------------------------------------------------------------
-- 7. Remove old household tables (data already copied to Wallet* above).
-- ---------------------------------------------------------------------------
DROP TABLE "Household";
DROP TABLE "HouseholdMembership";

-- ---------------------------------------------------------------------------
-- 8. Recreate indexes on walletId.
-- ---------------------------------------------------------------------------
CREATE INDEX "ApiToken_walletId_idx" ON "ApiToken"("walletId");
CREATE UNIQUE INDEX "Budget_walletId_category_key" ON "Budget"("walletId", "category");
CREATE INDEX "Category_walletId_type_idx" ON "Category"("walletId", "type");
CREATE UNIQUE INDEX "Category_name_walletId_type_key" ON "Category"("name", "walletId", "type");
CREATE INDEX "Notification_walletId_userId_createdAt_idx" ON "Notification"("walletId", "userId", "createdAt");
CREATE INDEX "RecurringItem_walletId_idx" ON "RecurringItem"("walletId");
CREATE INDEX "Transaction_walletId_date_idx" ON "Transaction"("walletId", "date");
CREATE INDEX "Transaction_walletId_type_idx" ON "Transaction"("walletId", "type");
CREATE INDEX "Transaction_walletId_goalId_idx" ON "Transaction"("walletId", "goalId");
CREATE INDEX "WalletMembership_userId_idx" ON "WalletMembership"("userId");
CREATE INDEX "Settlement_walletId_date_idx" ON "Settlement"("walletId", "date");

-- ---------------------------------------------------------------------------
-- 9. Foreign keys -> Wallet(id).
-- ---------------------------------------------------------------------------
ALTER TABLE "WalletMembership" ADD CONSTRAINT "WalletMembership_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletMembership" ADD CONSTRAINT "WalletMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InviteLink" ADD CONSTRAINT "InviteLink_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringItem" ADD CONSTRAINT "RecurringItem_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonthHistory" ADD CONSTRAINT "MonthHistory_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "YearHistory" ADD CONSTRAINT "YearHistory_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
