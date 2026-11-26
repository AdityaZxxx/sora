ALTER TABLE "WalletMembership"
ADD COLUMN "leftAt" TIMESTAMP(3),
ADD COLUMN "isPersonal" BOOLEAN NOT NULL DEFAULT false;

UPDATE "WalletMembership"
SET "isPersonal" = true
WHERE ("walletId", "userId") IN (
  SELECT DISTINCT ON ("userId") "walletId", "userId"
  FROM "WalletMembership"
  ORDER BY "userId", "joinedAt", "walletId"
);

DROP INDEX "WalletMembership_one_owner_per_wallet";

CREATE UNIQUE INDEX "WalletMembership_one_owner_per_wallet"
ON "WalletMembership"("walletId")
WHERE "role" = 'owner' AND "leftAt" IS NULL;

CREATE UNIQUE INDEX "WalletMembership_one_personal_per_user"
ON "WalletMembership"("userId")
WHERE "isPersonal" = true AND "leftAt" IS NULL;
