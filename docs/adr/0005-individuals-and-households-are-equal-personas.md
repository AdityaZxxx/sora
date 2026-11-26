# Individuals and households are equal personas

Sora is a finance app for individuals tracking their own money and for households sharing a ledger. The two personas get the same product quality: the same features, the same dashboard, the same onboarding shape. Solo is not a degraded mode and not a waiting room for inviting a partner; it is a first-class way to use Sora.

Equal personas means the same model shape, not one household per user. Every user has a personal wallet created at first run and may join or create any number of shared households. Personal wallets and shared households use the same wallet model and the same code paths; they differ by member count and by the role each member holds. There is no separate personal ledger, and a personal wallet's money is private because it has one member, not because it uses a different storage path.

## Rules this creates

- The Wallet switcher is always visible. A one-member personal wallet is labelled Personal wallet, and New wallet is reachable from the switcher so a user can create a shared household.
- There is no Shared or Personal choice in the transaction dialog. Every transaction belongs to exactly one wallet and counts toward that wallet's rollups, budgets, goals and charts.
- Balances, SharedSpendingCard and SimplifyDebts hide below their member-count threshold. Settlement history is the exception: it appears whenever settlements exist, even at one member, so history stays readable after a departure.
- New shared infrastructure, such as recurring bill definitions, is wallet scoped by default and stays correct for a one-member personal wallet.
- Account Settings holds profile, data export, authentication, appearance, agent access and account deletion. Manage keeps wallet members, roles, invites, name, currency, categories and budgets; goals render on the Dashboard for the active wallet.
- Docs, glossary, roadmap and the future landing page name both personas. In UI copy, a one-member wallet is never addressed as a household.

## Considered Options

- Equal personas with one wallet model (chosen): solo and sharing are the same code paths with different member counts and roles; the difference lives in copy, visibility rules and role checks.
- Fork a separate personal ledger entity (rejected): two authorization paths, two query paths, double the bugs, and nothing about the solo persona requires a different shape.
- Keep solo as a side effect of the household model (rejected): treating solo as an accident taxes the solo user with household language and invite-first framing forever.
- Limit a user to one household (rejected): a person sharing money with family, flatmates and friends needs those wallets kept apart.

## Consequences

- Every new feature ticket must state its solo behaviour before its shared behaviour, or both at once; a feature that only makes sense for two or more members must say so in the ticket.
- Wallet is the technical term. The glossary uses Shared household for a wallet with more than one member and Personal wallet for a one-member wallet.
- The landing page and onboarding, when built, address both personas from the first line.
- Feature parity is verified in review, not by a test suite: the running app is the check.
