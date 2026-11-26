import { DEFAULT_WALLET_NAME } from "@/lib/constants";

type WalletLabelInput = {
  name: string | null;
  isPersonal: boolean;
  memberCount: number;
};

export function walletLabel(wallet: WalletLabelInput) {
  return wallet.isPersonal && wallet.memberCount === 1
    ? "Personal wallet"
    : (wallet.name ?? DEFAULT_WALLET_NAME);
}
