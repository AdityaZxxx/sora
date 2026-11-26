CREATE TABLE "ApiTokenWallet" (
    "tokenId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,

    CONSTRAINT "ApiTokenWallet_pkey" PRIMARY KEY ("tokenId","walletId")
);

INSERT INTO "ApiTokenWallet" ("tokenId", "walletId")
SELECT "id", "walletId" FROM "ApiToken";

CREATE INDEX "ApiTokenWallet_walletId_idx" ON "ApiTokenWallet"("walletId");

ALTER TABLE "ApiToken" DROP CONSTRAINT "ApiToken_walletId_fkey";
DROP INDEX "ApiToken_walletId_idx";
ALTER TABLE "ApiToken" DROP COLUMN "walletId";

ALTER TABLE "ApiTokenWallet"
ADD CONSTRAINT "ApiTokenWallet_tokenId_fkey"
FOREIGN KEY ("tokenId") REFERENCES "ApiToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApiTokenWallet"
ADD CONSTRAINT "ApiTokenWallet_walletId_fkey"
FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
