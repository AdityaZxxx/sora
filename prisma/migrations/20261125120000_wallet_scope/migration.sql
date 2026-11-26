-- The settlement trigger and resolver belong to the old transaction-based
-- settlement model. Drop them before the columns they read are removed.
DROP TRIGGER IF EXISTS "Transaction_set_settlement_counterparty_id" ON "Transaction";
DROP FUNCTION IF EXISTS public.set_settlement_counterparty_id();
DROP FUNCTION IF EXISTS public.resolve_settlement_counterparty_id();

-- DropForeignKey
ALTER TABLE "ApiToken" DROP CONSTRAINT "ApiToken_householdId_fkey";

-- DropForeignKey
ALTER TABLE "Budget" DROP CONSTRAINT "Budget_householdId_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_householdId_fkey";

-- DropForeignKey
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_householdId_fkey";

-- DropForeignKey
ALTER TABLE "HouseholdMembership" DROP CONSTRAINT "HouseholdMembership_householdId_fkey";

-- DropForeignKey
ALTER TABLE "HouseholdMembership" DROP CONSTRAINT "HouseholdMembership_userId_fkey";

-- DropForeignKey
ALTER TABLE "InviteLink" DROP CONSTRAINT "InviteLink_householdId_fkey";

-- DropForeignKey
ALTER TABLE "MonthHistory" DROP CONSTRAINT "MonthHistory_householdId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_householdId_fkey";

-- DropForeignKey
ALTER TABLE "RecurringItem" DROP CONSTRAINT "RecurringItem_householdId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_counterpartyId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_householdId_fkey";

-- DropForeignKey
ALTER TABLE "YearHistory" DROP CONSTRAINT "YearHistory_householdId_fkey";

-- DropIndex
DROP INDEX "ApiToken_householdId_idx";

-- DropIndex
DROP INDEX "Budget_householdId_category_key";

-- DropIndex
DROP INDEX "Category_householdId_type_idx";

-- DropIndex
DROP INDEX "Category_name_householdId_type_key";

-- DropIndex
DROP INDEX "Notification_householdId_userId_createdAt_idx";

-- DropIndex
DROP INDEX "RecurringItem_householdId_idx";

-- DropIndex
DROP INDEX "Transaction_householdId_date_idx";

-- DropIndex
DROP INDEX "Transaction_householdId_goalId_idx";

-- DropIndex
DROP INDEX "Transaction_householdId_shared_type_idx";

-- AlterTable
ALTER TABLE "ApiToken" DROP COLUMN "householdId",
ADD COLUMN     "walletId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Budget" DROP COLUMN "householdId",
ADD COLUMN     "walletId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "householdId",
ADD COLUMN     "walletId" TEXT NOT NULL,
ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "Goal" DROP COLUMN "householdId",
ADD COLUMN     "walletId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "InviteLink" DROP COLUMN "householdId",
ADD COLUMN     "walletId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MonthHistory" DROP CONSTRAINT "MonthHistory_pkey",
DROP COLUMN "householdId",
ADD COLUMN     "walletId" TEXT NOT NULL,
ADD CONSTRAINT "MonthHistory_pkey" PRIMARY KEY ("walletId", "day", "month", "year");

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "householdId",
ADD COLUMN     "walletId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RecurringItem" DROP COLUMN "householdId",
ADD COLUMN     "walletId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "counterpartyId",
DROP COLUMN "householdId",
DROP COLUMN "shared",
ADD COLUMN     "walletId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "YearHistory" DROP CONSTRAINT "YearHistory_pkey",
DROP COLUMN "householdId",
ADD COLUMN     "walletId" TEXT NOT NULL,
ADD CONSTRAINT "YearHistory_pkey" PRIMARY KEY ("walletId", "month", "year");

-- DropTable
DROP TABLE "Household";

-- DropTable
DROP TABLE "HouseholdMembership";

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "currency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentAccessEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletMembership" (
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailDigest" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'member',

    CONSTRAINT "WalletMembership_pkey" PRIMARY KEY ("walletId","userId")
);

-- CreateTable
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

-- CreateIndex
CREATE INDEX "WalletMembership_userId_idx" ON "WalletMembership"("userId");

-- CreateIndex
CREATE INDEX "Settlement_walletId_date_idx" ON "Settlement"("walletId", "date");

-- CreateIndex
CREATE INDEX "ApiToken_walletId_idx" ON "ApiToken"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_walletId_category_key" ON "Budget"("walletId", "category");

-- CreateIndex
CREATE INDEX "Category_walletId_type_idx" ON "Category"("walletId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_walletId_type_key" ON "Category"("name", "walletId", "type");

-- CreateIndex
CREATE INDEX "Notification_walletId_userId_createdAt_idx" ON "Notification"("walletId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "RecurringItem_walletId_idx" ON "RecurringItem"("walletId");

-- CreateIndex
CREATE INDEX "Transaction_walletId_date_idx" ON "Transaction"("walletId", "date");

-- CreateIndex
CREATE INDEX "Transaction_walletId_type_idx" ON "Transaction"("walletId", "type");

-- CreateIndex
CREATE INDEX "Transaction_walletId_goalId_idx" ON "Transaction"("walletId", "goalId");

-- AddForeignKey
ALTER TABLE "WalletMembership" ADD CONSTRAINT "WalletMembership_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletMembership" ADD CONSTRAINT "WalletMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteLink" ADD CONSTRAINT "InviteLink_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringItem" ADD CONSTRAINT "RecurringItem_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthHistory" ADD CONSTRAINT "MonthHistory_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YearHistory" ADD CONSTRAINT "YearHistory_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

