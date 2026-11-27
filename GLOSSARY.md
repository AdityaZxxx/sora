# Sora

Sora is a free finance app for individuals and for couples and households. This glossary defines the words the product uses so that code, UI copy, and docs stay consistent.

## People and spaces

**User**:
A sign-in identity (email/password or Google). A user exists independently of any wallet.
_Avoid_: member, partner

**Display name**:
The name a user chooses for Sora to address them by. It belongs to the user, not to any wallet, and is shown wherever the user is attributed.
_Avoid_: username, handle

**Avatar**:
The single profile image shown for a user. A user has at most one avatar, chosen by the user, which replaces any image supplied by their sign-in provider.
_Avoid_: profile picture, photo, user image

**Wallet**:
The unit of ownership for every money record. A wallet has either one member, in which case the product calls it a personal wallet, or several members, in which case it is a shared household. Every transaction, category, budget, goal, currency setting, recurring item and settlement belongs to exactly one wallet. There is no cross-wallet aggregation.
_Avoid_: account, budget space

**Personal wallet**:
The wallet created at first run and marked as the user's personal wallet. It holds private money while it has one member. Additional shared households are separate wallets and never replace it.
_Avoid_: personal household

**Shared household**:
A wallet with more than one member. All money in it is shared money; no member keeps a private ledger inside it. The household name is used in copy, and users may belong to any number of shared households.
_Avoid_: account, family, budget space

**Member**:
A user who belongs to a wallet. Every member has one role: owner, co-owner, member or viewer. Membership history stays readable after someone leaves.
_Avoid_: partner

**Role**:
A wallet membership's level of access. Owner manages roles and transfers ownership. Co-owner invites, removes non-owners and changes settings. Member writes transactions, creates categories, and records settlements, and edits only their own transaction entries and the categories they added. Owners and co-owners rename or delete any category. Viewer reads without writing.

**Owner**:
The single member who manages roles in a wallet. The wallet creator becomes owner, and ownership transfers to a co-owner before the owner leaves. No other member can remove the owner.
_Avoid_: admin

**Co-owner**:
A member who invites, removes non-owners and changes wallet settings, but cannot change roles or remove the owner.
_Avoid_: admin

**Viewer**:
A member who reads the ledger, balances, budgets and goals without writing.
_Avoid_: view-only member

**API token**:
A user owned credential for the MCP endpoint and CLI. It lists the wallets it may reach and an access level of read only or read write. Effective access is the intersection with the current role in each listed wallet.

**Account Settings**:
The page for user scope concerns: profile, your data, authentication, appearance, agent access and account deletion. Wallet data stays on Manage.

**Invite link**:
A revocable, shareable link (also shown as a QR code) that adds a person to a wallet when they sign in through it. Owners and co-owners create, rotate and revoke it; invitees join as members.
_Avoid_: invite code, email invite

## Money records

**Transaction**:
A single income or expense entry in a wallet ledger, attributed to the member who added it. Every transaction counts toward its wallet's totals, budgets and history. Attributed transactions stay in the ledger even if that member leaves.
_Avoid_: entry, payment

**Category**:
A label for transactions (for example Groceries) owned by exactly one wallet, with an icon and an income or expense type. Every category records the member who created it, and that attribution survives when the creator leaves. Any member may create a category and rename, re-icon or delete one they added; owners and co-owners may rename, re-icon or delete any category.

**Budget**:
A monthly spending limit on one category within a wallet. A budget is either soft (warns at the limit) or hard (blocks transactions over the limit), and is interpreted in that wallet's currency.
_Avoid_: envelope, spending plan

**Goal**:
A wallet savings target with an optional deadline. Contributions to a goal are transactions tagged with the goal, interpreted in that wallet's currency.
_Avoid_: savings target

**Settlement**:
A first class record of money one member paid another outside Sora, with a payer, receiver, amount and date. It reduces what they owe each other but is not a transaction and never enters wallet totals, statistics or budgets. Only the two involved members see its amount.
_Avoid_: payment, transfer

**Settlement counterparty**:
The other party in a Settlement. Either member may record one for a payment they personally made or received.
_Avoid_: payee, recipient

**Active wallet**:
The wallet a user is currently working in. Remembered per browser and validated against active memberships on every read; switching changes every screen at once. The switcher is always visible so a second wallet can be created from it.
_Avoid_: current workspace, selected account

**Balance**:
The net amount one member owes another, computed from expenses and settlements in one wallet. A nonzero balance with any other member blocks departure from that wallet.

**Split share**:
The part of one expense that a single member owes. Shares default to an even split across all members; an expense can also carry per-member shares by amount or percent. Shares never change who added the transaction: the adder fronts the money and the others owe their shares back.

**Currency**:
The single currency of a wallet. Each wallet chooses its own, so changing a personal wallet never changes a shared household. All amounts in a wallet are in its currency.

**Recurring item**:
A wallet-level definition of a repeating income or expense (weekly on a weekday, or monthly on a date), carrying name, amount, category, and optional start and end dates or pause. Members record the actual transaction from the list when it comes due; nothing posts automatically.
_Avoid_: subscription (that is one source of these), schedule

**Upcoming bills**:
The dashboard list of recurring items due or past due. Tapping one opens a prefilled transaction dialog; the member confirms or adjusts the real date and amount, which is what lands in the ledger.

**Insights**:
The dashboard section that reports the active wallet's own numbers: savings rate for the current month and the trend of monthly net (income minus expense) over the last six months.

**Savings rate**:
(income − expense) / income for one month, per wallet. When income is zero the rate is undefined and shown as a dash, never as a real number.

**Unusual spending**:
A transaction whose amount exceeds twice the trailing three-month average for its category in that wallet, where that average clears a currency-scaled floor so tiny categories do not alert. Notifications carry no amounts beyond what the recipient can already see. In-app only.
_Avoid_: alert, anomaly flag

**Safe-to-spend**:
The sum of the remaining amounts of this month's budgets in the active wallet, across all budgeted categories. It answers "how much may this wallet still spend this month". Unbudgeted categories do not count; with no budgets, the app invites the wallet to set one instead of showing a number.
