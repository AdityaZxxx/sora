# All app data is scoped to a Household, not to a User

The app previously scoped every record to the signed-in user. Sora is a couples/households product, so the shared space (the Household) is the primary scope: transactions, categories, budgets, and goals belong to a household, and users reach them through membership.

The repo is treated as fresh (zero existing users), so the schema moves to household scope directly with no data migration. A signed-in user starts solo use by submitting the first-run "Get started" form. That submission creates a personal Household. A GET of the wizard is read-only and never creates one. An invite link adds the second member to the inviter's household.

Members have a role ladder: owner, co-owner, member and viewer. The wallet creator is owner, only the owner changes roles, and owners and co-owners invite and remove non-owners. Members write their own entries, owners and co-owners may edit any entry, and viewers only read. When a member leaves, their transactions stay in the ledger, attributed to them.

## Considered Options

- Lazy personal Household per user, join by invite link (chosen): solo use and sharing are the same model.
- Create the personal Household automatically on sign-up or on the first wizard GET (rejected): a GET performed a write and removed the user's explicit setup step.
- Invite creates a fresh shared Household and migrates the inviter's data (rejected): leaves two households to reconcile.
- Invite only works for brand-new users (rejected): punishes anyone who already tried the app solo.

## Consequences

- Every query resolves the member's household first; authorization is "is a member of this household," not "owns this row."
- Leaving does not delete history, so attribution is stored on the transaction, not derived from current membership.
