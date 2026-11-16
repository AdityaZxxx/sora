-- AlterTable
ALTER TABLE "Category"
  ADD COLUMN "iconColor" TEXT,
  ADD COLUMN "iconKind" TEXT NOT NULL DEFAULT 'emoji';

-- AlterTable
ALTER TABLE "Transaction"
  ADD COLUMN "categoryIconColor" TEXT,
  ADD COLUMN "categoryIconKind" TEXT NOT NULL DEFAULT 'emoji';

-- AlterTable
ALTER TABLE "RecurringItem"
  ADD COLUMN "categoryIconColor" TEXT,
  ADD COLUMN "categoryIconKind" TEXT NOT NULL DEFAULT 'emoji';
