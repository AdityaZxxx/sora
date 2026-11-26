ALTER TABLE "Category"
ADD COLUMN "createdById" TEXT,
ADD COLUMN "createdByName" TEXT;

ALTER TABLE "Category"
ADD CONSTRAINT "Category_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
