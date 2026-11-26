# Manage

The manage page is the household admin surface: the space name, appearance, the agent access switch, members, currency settings, categories, budgets, the privacy/export card, and account deletion.

## Sub-features

- `manage-space-rename` an owner or co-owner can rename the wallet.
- `manage-invite-link` an owner or co-owner can create a revocable invite link or QR code.
- `manage-appearance` a member can choose light, dark, or system theme through icon-only tabs with tooltips. The choice persists on that device.
- `manage-invite-use` a recipient opens the link, signs in, and is added to the household.
- `manage-agent-access` covered by [Agent access](./agent-access.md); the card sits above the members section.
- `manage-members` lists every member with their role; the owner can change roles.
- `manage-members-leave` a non-owner member can leave the wallet; the owner must transfer ownership first.
- `manage-members-remove` an owner or co-owner can remove non-owners.
- `manage-members-digest` a member can toggle their own daily email digest.
- `manage-space-currency` the household currency, editable here through the currency combobox.
- `manage-categories` creating, editing and deleting categories. Cards show the wallet label, creator name and why a control is unavailable.
- `manage-budgets` see [Budgets](./budgets.md); the card is placed on this page.
- `manage-export` a member with edit access can download a full export of the household as JSON; amounts are fixed-2-decimal strings.
- `manage-delete-account` a member can delete their sign-in; a household where they are the last member is deleted with all its data.

## How to get to it (user POV)

- Choose `Manage` in the top navigation.
- Open `/manage` directly.
- Follow an invite link at `/invite/[token]` to join a new household.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `$U`; `control-sora doctor` passes.
- The seeded wallet is in place (`control-sora reset`): one owner and one member; agent access is on with two tokens.
- The browser is signed in as `avery@sora.test` (`control-sora login`).

- **Open the manage page.** Run `control-sora browser open "$U/manage"`. Assert the cards, in order: `Your space`, `Invite link`, `Appearance`, `Agent access`, `Members`, `Currency settings`, `Transaction categories`, `Budgets`, `Your data`, `Delete account`. Only owners and co-owners can manage the `Invite link` card.
- **Appearance.** The `Appearance` card sits beside `Invite link` on desktop and directly below it on mobile. Its `Light theme`, `Dark theme`, and `System theme` tabs show matching tooltips. Selecting a tab applies and stores that theme; light and dark remain selected after a reload, while system follows the device's color-scheme preference. The navbar and mobile navigation sheet have no theme control.
- **Members.** Assert both `Avery Quinn` and `Blake Rivera` appear. Past members appear under `Past members` after someone leaves. The owner sees the role combobox `Access for <name>` with Owner, Co-owner, Member and Viewer; other roles see the role as a label.
- **Rename the space.** Run `control-sora browser find role button click --name "Rename"`. Fill `Name` with `Lakeview Villa` and submit. The card reads `Lakeview Villa`.
- **Currency.** The `Currency settings` card shows a combobox (`🇺🇸 United States Dollar`). Picking another currency calls the update action immediately; no separate save step exists.
- **Digest toggle.** Assert the digest switch reflects the current state; toggling flips and persists.
- **Export.** Run `control-sora browser eval 'fetch("/api/export").then(r=>r.json()).then(d=>JSON.stringify({n:d.transactions.length,amount:d.transactions[0].amount,type:typeof d.transactions[0].amount}))'`. It returns `6` rows and an `amount` such as `"200.00"` with type `string`. A viewer gets HTTP 403 from `/api/export`.
- **Delete account.** The confirm dialog states that every household where the member is the last one is deleted with all its data. Exercise end-to-end only on a disposable database you can reseed immediately after.
- **Proof.** `control-sora browser screenshot <artifact-dir>/manage/page.png` and `browser snapshot -i`.

## Gotchas

- The page orders cards top to bottom as listed above; `Agent access` is above `Members`.
- The currency is editable here. Changing it applies immediately and changes household formatting everywhere.
- The invite link's QR code uses an inlined SVG and does not appear in the DOM's responsive snapshot; use the `Copy invite link` button to copy it.
- `Transaction categories` cards show the owning wallet and the creator name. Members see an explanation instead of rename and delete controls; owners and co-owners see the actions menu.
- An owner or co-owner can remove non-owners; the owner cannot be removed by another member. A viewer sees no `Remove` control.
- The `Leave wallet` button appears for non-owner members when at least one other member exists. The owner sees a prompt to promote a co-owner instead.
