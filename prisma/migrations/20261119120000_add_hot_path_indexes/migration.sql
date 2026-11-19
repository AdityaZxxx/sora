-- AlterTable
ALTER TABLE "MonthHistory" DROP CONSTRAINT "MonthHistory_pkey",
ADD CONSTRAINT "MonthHistory_pkey" PRIMARY KEY ("householdId", "day", "month", "year");

-- AlterTable
ALTER TABLE "YearHistory" DROP CONSTRAINT "YearHistory_pkey",
ADD CONSTRAINT "YearHistory_pkey" PRIMARY KEY ("householdId", "month", "year");

-- CreateIndex
CREATE INDEX "HouseholdMembership_userId_idx" ON "HouseholdMembership"("userId");

-- CreateIndex
CREATE INDEX "Category_householdId_type_idx" ON "Category"("householdId", "type");

-- CreateIndex
CREATE INDEX "Notification_householdId_userId_createdAt_idx" ON "Notification"("householdId", "userId", "createdAt");
