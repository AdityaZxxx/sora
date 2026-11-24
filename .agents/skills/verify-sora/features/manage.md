# Manage

The manage page is the household admin surface: the space name, appearance, the agent access switch, members, currency settings, categories, budgets, the privacy/export card, and account deletion.

## Sub-features

- `manage-space-rename` a full member can rename the household.
- `manage-invite-link` a full member can create a revocable invite link or QR code.
- `manage-appearance` a member can choose light, dark, or system theme through icon-only tabs with tooltips. The choice persists on that device.
- `manage-invite-use` a recipient opens the link, signs in, and is added to the household.
- `manage-agent-access` covered by [Agent access](./agent-access.md); the card sits above the members section.
- `manage-members` lists every member with their role; a full member can change roles.
- `manage-members-leave` a member can leave the household; the last member cannot leave without deleting it.
- `manage-members-remove` a full member can remove any other member.
- `manage-members-digest` a member can toggle their own daily email digest.
- `manage-space-currency` the household currency, editable here through the currency combobox.
- `manage-categories` creating, editing, and deleting categories.
- `manage-budgets` see [Budgets](./budgets.md); the card is placed on this page.
- `manage-export` a full member can download a full export of the household as JSON; amounts are fixed-2-decimal strings.
- `manage-delete-account` a member can delete their sign-in; a household where they are the last member is deleted with all its data.

## How to get to it (user POV)

- Choose `Manage` in the top navigation.
- Open `/manage` directly.
- Follow an invite link at `/invite/[token]` to join a new household.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `$U`; `control-sora doctor` passes.
- The seeded household is in place (`control-sora reset`): two full members; agent access is on with two tokens.
- The browser is signed in as `avery@sora.test` (`control-sora login`).

- **Open the manage page.** Run `control-sora browser open "$U/manage"`. Assert the cards, in order: `Your space`, `Invite link`, `Appearance`, `Agent access`, `Members`, `Currency settings`, `Transaction categories`, `Budgets`, `Your data`, `Delete account`. For a view-only caller the `Invite link` card is absent.
- **Appearance.** The `Appearance` card sits beside `Invite link` on desktop and directly below it on mobile. Its `Light theme`, `Dark theme`, and `System theme` tabs show matching tooltips. Selecting a tab applies and stores that theme; light and dark remain selected after a reload, while system follows the device's color-scheme preference. The navbar and mobile navigation sheet have no theme control.
- **Members.** Assert both `Avery Quinn` and `Blake Rivera` appear. A full member sees the role combobox `Access for <name>` with `Full edit` and `View only`; a view-only member sees no role controls.
- **Rename the space.** Run `control-sora browser find role button click --name "Rename"`. Fill `Name` with `Lakeview Villa` and submit. The card reads `Lakeview Villa`.
- **Currency.** The `Currency settings` card shows a combobox (`🇺🇸 United States Dollar`). Picking another currency calls the update action immediately; no separate save step exists.
- **Digest toggle.** Assert the digest switch reflects the current state; toggling flips and persists.
- **Export.** Run `control-sora browser eval 'fetch("/api/export").then(r=>r.json()).then(d=>JSON.stringify({n:d.transactions.length,amount:d.transactions[0].amount,type:typeof d.transactions[0].amount}))'`. It returns `6` rows and an `amount` such as `"200.00"` with type `string`. A view-only caller gets HTTP 403 from `/api/export`.
- **Delete account.** The confirm dialog states that every household where the member is the last one is deleted with all its data. Exercise end-to-end only on a disposable database you can reseed immediately after.
- **Proof.** `control-sora browser screenshot <artifact-dir>/manage/page.png` and `browser snapshot -i`.

## Gotchas

- The page orders cards top to bottom as listed above; `Agent access` is above `Members`.
- The currency is editable here. Changing it applies immediately and changes household formatting everywhere.
- The invite link's QR code uses an inlined SVG and does not appear in the DOM's responsive snapshot; use the `Copy invite link` button to copy it.
- `Budgets` and `Transaction categories` are interactive; exercise them via their own feature files.
- A full member can remove any other member; self-removal is rejected. A view-only member sees no `Remove` control.
- The `Leave household` button only appears when at least one other member exists in the household.
