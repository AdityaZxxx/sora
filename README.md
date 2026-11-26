# Sora

Sora is a free finance app for individuals, couples, and households. Each wallet has one ledger for income and expenses, with budgets, goals, balances, and a scoped API for agents. There is no subscription and no advertising. Sora records what you owe and what you paid; it never holds, moves, or transfers money.

## How it works

A **wallet** is the space where money records live. It has one member, in which case the app calls it a personal wallet, or several, in which case it is a shared household. Every money record belongs to exactly one wallet. Solo use is a first-class case, so the app addresses a solo user as a person rather than as a group.

A wallet has four roles: owner, co-owner, member and viewer. Members add transactions and edit their own entries; owners and co-owners also manage budgets, goals, settings, invites and removals; only the owner changes roles and transfers ownership. Viewers read the ledger without writing. People join through a revocable invite link or QR code, and transactions a departing member added stay in the ledger with their name attached. Amounts are stored as fixed-point decimals and shown in the wallet's own currency, chosen at onboarding.

Sora is a ledger, not a bank. A **settlement** records that one member paid another what they owed; no funds move through the app. Recurring items produce an **Upcoming bills** list that a member confirms into a real transaction, so nothing posts automatically.

## Features

- **Shared ledger.** Income and expense transactions, custom categories with icons, and filters over the transaction history. Every transaction counts toward its wallet totals. Split an expense evenly, by amount, or by percent. Settlements are separate records whose amounts only the two involved members see.
- **Balances and settlements.** See who owes whom, simplify debts, and record a settlement as its own record. Only the two involved members see its amount. No money changes hands inside Sora.
- **Budgets.** Monthly spending limits per category, either soft (warn at the limit) or hard (block an over-limit expense). Safe-to-spend totals the remaining budget for the month.
- **Goals.** A wallet savings target with an optional deadline, funded by transactions tagged to the goal.
- **Insights.** The active wallet's own numbers: savings rate for the current month and the trend of monthly net over the last six months. Unusual spending is flagged in-app against a category's recent average.
- **Recurring items.** Weekly or monthly definitions with an Upcoming bills list. The member confirms the real date and amount before anything lands in the ledger.
- **Agent access.** Enable it per wallet, issue scoped API tokens, and reach the same domain logic through the MCP endpoint at `/api/mcp` or the `sora` CLI. See [Agent access](#agent-access).
- **Account and data.** Full JSON and CSV export, in-app account deletion that cascades sole-member wallets, a short privacy page, optional email digest, and a light and dark theme.

Sora is in active development. The build order, milestones, and launch plan live in [docs/ROADMAP.md](docs/ROADMAP.md).

## Tech stack

- **App:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Base UI, Motion, Lucide icons, and ECharts.
- **Data:** PostgreSQL with Prisma 7 and the `pg` adapter. Money uses fixed-point decimals end to end.
- **Auth and email:** Better Auth with email and password plus optional Google sign-in, bcrypt for password hashing, and Resend for verification, password reset, and the optional digest.
- **Client state and forms:** TanStack Query, TanStack Form, TanStack Table, and Zod contracts shared by the web, API, MCP, and CLI surfaces.
- **Tooling:** pnpm workspaces, oxlint with a local rule plugin, oxfmt, TypeScript, Husky, and lint-staged.

## Local development

### Prerequisites

- Node.js 26 (the version used by CI and the release workflow)
- pnpm 12
- PostgreSQL that accepts TLS connections, since the Prisma adapter connects with SSL enabled. A free-tier Neon database works, or run a local server with SSL on.

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/AdityaZxxx/sora.git
   cd sora
   ```

2. Install dependencies. The `postinstall` step generates the Prisma client:

   ```bash
   pnpm install --frozen-lockfile
   ```

3. Copy `.env.example` to `.env` and fill in the values:

   ```bash
   cp .env.example .env
   ```

   | Variable                   | Purpose                                                                  |
   | -------------------------- | ------------------------------------------------------------------------ |
   | `POSTGRES_PRISMA_URL`      | Pooled connection string used by the app                                 |
   | `POSTGRES_URL_NON_POOLING` | Direct connection string used as Prisma's shadow database for migrations |
   | `BETTER_AUTH_SECRET`       | Session signing secret, generate one with `openssl rand -base64 32`      |
   | `BETTER_AUTH_URL`          | App origin, `http://localhost:3000` locally                              |

   `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` enable optional Google sign-in. If you use them, add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI in the Google Cloud Console. `RESEND_API_KEY` and `RESEND_FROM` enable auth emails and the digest; without them, local email sends are skipped with a warning. `CRON_SECRET` guards the daily digest route.

4. Apply the schema to your database:

   ```bash
   pnpm exec prisma migrate dev
   ```

5. Start the app:

   ```bash
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000), sign up with email and password, pick a currency, and you land in an empty household.

### Quality checks

```bash
pnpm run verify   # lint, format check, and typechecks across the workspace
pnpm build        # production build
```

There is no unit test suite by decision. CI checks what compiles and applies the mechanical rules from `sora-lint-plugin`; behaviour is proved by running the app. The `.agents/skills/verify-sora` skill drives the real web UI, CLI, and MCP endpoint against a disposable database and captures proof.

## Agent access

A household can enable agent access and issue API tokens from the Manage page. Tokens are scoped `read-only` or `read-write`, can be revoked, and can be given an expiry date. Every request is authenticated with a bearer token and checked against current household membership.

Two surfaces use those tokens:

- **MCP.** POST to `/api/mcp` with `Authorization: Bearer <token>`. Read tools are available to both scopes; write tools are registered only for `read-write` tokens. The endpoint is stateless and works on serverless.
- **CLI.** `sora` is a small client in `packages/sora-cli` that calls MCP tools with flags. Run `pnpm --filter sora-cli build`, set `SORA_URL` and `SORA_TOKEN`, then use `sora <command> --help` to see the available commands. `SORA_URL` defaults to `http://localhost:3000/api/mcp`.

The feature map in `.agents/skills/verify-sora/features/agent-access.md` lists what a token can and cannot do.

## Repository layout

| Path          | Contents                                    |
| ------------- | ------------------------------------------- |
| `app/`        | Routes, server actions, and API routes      |
| `components/` | React components                            |
| `hooks/`      | Client hooks                                |
| `lib/`        | Domain functions that every surface reaches |
| `schemas/`    | Zod contracts the transports validate with  |
| `prisma/`     | Schema and migrations                       |
| `packages/`   | `sora-cli` and `sora-lint-plugin`           |
| `docs/`       | ADRs, roadmap, and the release process      |

Product vocabulary is defined in [GLOSSARY.md](GLOSSARY.md), hard-to-reverse decisions in [docs/adr/](docs/adr/), and contribution rules in [CODING_STANDARDS.md](CODING_STANDARDS.md).

## Releasing

Merging to `main` never deploys. Publishing to production is a manual run of the Release workflow, which checks the commit, applies migrations, deploys, smoke tests, and tags the release. See [docs/release.md](docs/release.md).
