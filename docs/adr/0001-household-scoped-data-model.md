# All money records are scoped to a Wallet, not to a User

The app originally scoped every record to the signed-in user. Sora is a finance app for individuals and for couples and households, so the primary scope is now the Wallet: transactions, categories, budgets, goals, currency settings, recurring items and settlements belong to exactly one wallet, and users reach them through membership. A personal wallet and a shared household are the same technical kind of thing with different member counts; there is no separate personal ledger and no cross-wallet aggregation.

The repo is treated as fresh (zero existing users), so the schema moved to wallet scope as a clean break with no data migration. A signed-in user starts solo use by submitting the first-run "Get started" form, which creates a personal wallet and marks that first membership as personal. A GET of the wizard is read-only and never creates one. An invite adds a membership to the inviter's wallet; it never replaces the recipient's personal wallet. Joining switches the active wallet while the personal wallet stays reachable through the switcher. A user may create additional shared households, and membership history remains readable after someone leaves by keeping the membership row with a departure timestamp.

Every wallet has a role ladder: owner, co-owner, member and viewer. The wallet creator becomes owner. Only the owner appoints or demotes co-owners and transfers ownership, and no other member can remove the owner. Owners and co-owners invite, remove non-owners and change wallet settings, budgets and goals. Members add transactions, create and edit the categories they added, and record settlements they personally paid or received, and edit only their own entries; owners and co-owners may edit any entry or category. Viewers only read. Before an owner leaves, they must promote a co-owner to owner. Leaving or removing a member is blocked while that member has a nonzero net balance with any other member of the wallet.

## Considered Options

- One wallet model with a personal marker and shared households (chosen): solo use and sharing share code paths and differ by member count and role.
- Create the personal wallet automatically on sign-up or on the first wizard GET (rejected): a GET performed a write and removed the user's explicit setup step.
- Fork a separate personal ledger entity and migrate data on invite (rejected): two authorization paths, two query paths and two sets of bugs.
- Infer the personal wallet from the oldest membership (rejected): the label moved when that wallet gained members or the user joined another wallet first.
- Delete memberships when someone leaves (rejected): destroyed attribution and the ability to show past members.
- Giving every full member invite, remove and rotate rights (rejected): an invitee could remove the wallet creator or share the wallet without consent.

## Consequences

- Every read and write filters by wallet id from the active membership; authorization is membership and role, not ownership of a row.
- Attribution is stored on the record, not derived from current membership, so history survives departures.
- Allowing more than one wallet per user means every query key and cache tag must account for the active wallet, and switching invalidates client queries.
- Agent tokens are user owned credentials with an allowed wallet list; their effective access is the token scope intersected with the user's current role in each listed wallet.
