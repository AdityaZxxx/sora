UPDATE "WalletMembership"
SET "role" = 'viewer'
WHERE "role" = 'view_only';

UPDATE "WalletMembership"
SET "role" = 'owner'
WHERE ("walletId", "userId") IN (
  SELECT DISTINCT ON ("walletId") "walletId", "userId"
  FROM "WalletMembership"
  WHERE "role" = 'member'
  ORDER BY "walletId", "joinedAt", "userId"
);

CREATE UNIQUE INDEX "WalletMembership_one_owner_per_wallet"
ON "WalletMembership"("walletId")
WHERE "role" = 'owner';
