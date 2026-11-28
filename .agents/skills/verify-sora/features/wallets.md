# Wallets and switching

A user has one marked personal wallet and can create or join any number of shared wallets. Every screen shows one active wallet. The switcher sits in the desktop navbar and inside the mobile navigation sheet.

## Sub-features

- `wallet-switcher` lists the personal wallet and every shared wallet, and is visible even with one wallet.
- `wallet-personal-label` labels the one-member personal wallet as `Personal wallet`.
- `wallet-create` creates a second wallet from the switcher and switches to it.
- `wallet-switch` changes the active wallet and every screen follows.
- `wallet-invite-join` joins by invite while leaving the personal wallet and its records intact.
- `wallet-invite-rotate` replaces the active invite link and revokes the old one.
- `wallet-past-members` shows members who have left, with their names.

## How to get to it (user POV)

- The wallet switcher sits in the navbar on desktop and in the mobile navigation sheet.
- Choose `New wallet` in the switcher, name it, and choose `Add`.
- Choose a different wallet in the switcher to make it active.
- An owner or co-owner can rotate the invite link from the Manage page.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `$U`; `control-sora doctor` passes.
- The seeded wallet is in place (`control-sora reset`): a personal wallet with Avery as owner and Blake as member.

- **Open the switcher.** Run `control-sora browser open "$U/"` and `control-sora browser snapshot -i`. The `Switch wallet` button is present with one wallet.
- **Create a second wallet.** Click `Switch wallet`, choose `New wallet`, fill `Family`, click `Add`. The dashboard heading still greets Avery, the switcher label reads `Family`, and the wallet list contains both wallets.
- **Switch back.** Open the switcher and choose `Sora Verification Wallet 2`, the seeded wallet. The `Personal wallet` label applies only while a wallet has one member. The figures from `Family` must not appear; totals return to the seeded values.
- **Rotate the invite link.** Open `$U/manage` and open `Manage invite link`. A fresh reset seeds no link, so `Rotate link` stays disabled until `Create new link` is clicked. With a link present, rotating revokes the old token and shows a new one.
- **Proof.** Capture the switcher before and after creation, and record the totals seen in each wallet.

## Gotchas

- The personal wallet label only applies while that wallet has one member.
- Switching writes the active-wallet cookie and refreshes the route. Wallet-scoped query keys keep each wallet's figures separate, so no global cache clear is needed; allow a moment before reading figures.
- `control-sora reset` reseeds a single wallet, so create the second wallet during the run rather than expecting it in the fixture.
