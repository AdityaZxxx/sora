# Sora

Sora is a free finance app for individuals and for couples and households. This glossary defines the words the product uses so that code, UI copy, and docs stay consistent.

## People and spaces

**User**:
A sign-in identity (email/password or Google). A user exists independently of any household.
_Avoid_: member, partner

**Personal wallet**:
The wallet created at first run and marked as the user's personal wallet. It holds private money while it has one member. Additional shared households are separate wallets and never replace it.
_Avoid_: personal household

**Household**:
The space where a person keeps their finances, alone or shared. A couple or family keeps theirs together; an individual keeps their own. All money records belong to exactly one household. A household may have exactly one member (a solo household); solo and shared households are the same model, and the product treats the solo case as a first-class persona (ADR 0005). User-facing copy addresses a one-member household as the person, never as a "household".
_Avoid_: account, family, budget space, and "household" in copy aimed at a solo user

**Member**:
A user who belongs to a wallet. Every member has one role: owner, co-owner, member or viewer.
_Avoid_: partner

**Role**:
A wallet membership's level of access. Owner manages roles and transfers ownership. Co-owner invites, removes non-owners and changes settings. Member writes transactions, categories and settlements, and edits only their own entries. Viewer reads without writing.

**Owner**:
The single member who manages roles in a shared wallet. The wallet creator becomes owner, and ownership transfers before the owner leaves.
_Avoid_: admin

**Co-owner**:
A member who invites, removes non-owners and changes wallet settings, but cannot change roles or remove the owner.
_Avoid_: admin

**Viewer**:
A member who reads the ledger, balances, budgets and goals without writing.
_Avoid_: view-only member

**Invite link**:
A revocable, shareable link (also shown as a QR code) that adds a person to a household when they sign in through it.
_Avoid_: invite code, email invite

## Money records

**Transaction**:
A single income or expense entry in a household ledger, attributed to the member who added it. Attributed transactions stay in the ledger even if that member leaves.
_Avoid_: entry, payment

**Shared transaction**:
A transaction that counts toward household totals and budgets and is visible to all members.
_Avoid_: joint expense

**Personal transaction**:
A transaction visible only to the member who added it; excluded from household totals and budgets.
_Avoid_: private expense

**Category**:
A label for transactions (for example Groceries), owned by a household, with an icon and an income or expense type.

**Budget**:
A monthly spending limit on one category within a household. A budget is either soft (warns at the limit) or hard (blocks transactions over the limit).
_Avoid_: envelope, spending plan

**Goal**:
A household savings target with an optional deadline. Contributions to a goal are transactions tagged with the goal.
_Avoid_: savings target

**Settlement**:
A first class record of money one member paid another outside Sora, with a payer, receiver, amount and date. It reduces what they owe each other but is not a transaction and never enters wallet totals. Only the two involved members see its amount.
_Avoid_: payment, transfer

**Settlement counterparty**:
The other party in a Settlement. Either member may record one for a payment they personally made or received.
_Avoid_: payee, recipient

**Active wallet**:
The wallet a user is currently working in. Remembered per browser and validated against active memberships on every read; switching changes every screen at once. The switcher is always visible so a second wallet can be created from it.
_Avoid_: current workspace, selected account

**Balance**:
The net amount one member owes another, computed from shared transactions and settlements.

**Split share**:
The part of one shared expense that a single member owes. Shares default to an even split across all members; a shared expense can also carry per-member shares by amount or percent. Shares never change who added the transaction: the adder fronts the money and the others owe their shares back.

**Currency**:
The single currency of a household, chosen at onboarding. All amounts in the household are in this currency.

**Recurring item**:
A household-level definition of a repeating income or expense (weekly on a weekday, or monthly on a date), carrying name, amount, category, and optional start and end dates or pause. Members record the actual transaction from the list when it comes due; nothing posts automatically.
_Avoid_: subscription (that is one source of these), schedule

**Upcoming bills**:
The dashboard list of recurring items due or past due. Tapping one opens a prefilled transaction dialog; the member confirms or adjusts the real date and amount, which is what lands in the ledger.

**Insights**:
The dashboard section that reports the household's own numbers: savings rate for the current month and the trend of monthly net (income minus expense) over the last six months.

**Savings rate**:
(income − expense) / income for one month, per household. When income is zero the rate is undefined and shown as a dash, never as a real number.

**Unusual spending**:
A transaction whose amount exceeds twice the trailing three-month average for its category, where that average clears a currency-scaled floor so tiny categories do not alert. Evaluated on shared transactions for the household and on a member's personal transactions for that member alone; notifications carry no amounts beyond what the recipient can already see. In-app only.
_Avoid_: alert, anomaly flag

**Safe-to-spend**:
The sum of the remaining amounts of this month's budgets, across all budgeted categories. It answers "how much may this household still spend this month". Unbudgeted categories do not count; with no budgets, the app invites the household to set one instead of showing a number.
