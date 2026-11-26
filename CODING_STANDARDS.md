# Coding Standards

These are the judgement calls this repo makes. Mechanical rules (where a file lives, what a function is called) belong in the linter rather than here, because a check fails loudly and prose drifts silently. The product also runs on free tiers only (`docs/adr/0002-free-forever-zero-cost.md`), so a diff that needs a paid service is a finding.

## Wallet scope is the authorization model

Authorization is membership, not ownership of a row. Resolve the caller's Wallet first, then scope every read and write by `walletId`. A personal wallet has one member, so its money is private by construction; a shared wallet holds only shared money.

A user has one marked personal wallet and any number of shared wallets. Active membership means a membership row with `leftAt` null; leaving sets that timestamp but keeps history readable. Every read and write resolves the active wallet from those active rows.

Attribution and visibility are different questions. A transaction records the member who added it (`addedById`), and that member can leave the wallet without their transactions disappearing. So "who added it" never answers "who can see it", and only the wallet does.

The four roles are owner, co-owner, member and viewer. Members write transactions, categories and settlements; owners and co-owners also manage budgets, goals, settings, invites and removals; only the owner changes roles and transfers ownership. Viewers only read. A write that is unavailable to the caller is rejected in the `lib/` seam, not only hidden in the UI.

A reviewer should be able to point at the `walletId` filter in every query the diff touches. A query that filters by `addedById` where the intent was "in this wallet" is a bug even when it returns the right rows today.

## Every wallet is one ledger

Every transaction in a wallet counts toward that wallet's totals, budgets, and history rollups. There are no private rows inside a wallet and no cross wallet aggregation. Settlements are first class records outside the transaction ledger.

One filter shape covers the whole codebase: scope by `walletId`. A query that leaves out the wallet filter can mix one wallet's figures into another's, so the filter belongs on reads and writes alike. Switching the active wallet changes every screen at once.

## Rollups move with the transaction

`MonthHistory` and `YearHistory` are denormalised counters that the dashboard reads instead of scanning transactions. Creating or deleting a transaction updates them in the same `prisma.$transaction`, incrementing or decrementing the matching month.

A diff that writes a transaction without touching the rollups passes every type check and silently corrupts the dashboard. Check the pair: transaction write, rollup write, same transaction.

## Dates are UTC

Transaction dates are stored as UTC (`dateToUtcDate`) and rollup buckets use the UTC getters, so a transaction's month is its UTC month. Budget months follow the same calendar (`utcMonthRangeFor`).

Mixing local-time getters into a bucket key files a transaction under a different month than the one the rollups counted. Use the UTC getters for any date that names a bucket.

## Money is formatted through the wallet currency

The wallet holds one currency. Format amounts with `getFormatterForCurrency(wallet.currency ?? "USD")`; it picks the locale from the currency and drops the decimals on whole amounts.

A diff that formats an amount inline, or hardcodes a currency, breaks a wallet whose currency is not USD. Changing one wallet's currency never changes another's.

## Budgets are soft or hard, per budget

A budget is a monthly limit on one category. `soft` warns at 80% and 100%; `hard` rejects the transaction that would take the month over the limit. The mode is a property of the budget, not a global setting.

Budgets apply to all expenses in the wallet. Settlements are excluded from budget spend, because a settlement is not a transaction. The threshold check reads the month's spend before the transaction lands, so adding one recomputes rather than double counts, and one transaction produces at most one notification, for the highest threshold it crossed.

## Writes are actions, reads are cached lib functions exposed over GET routes

Mutations are server actions, so the wallet check runs inside the same call as the write, with no second entry point to forget. Initial reads may run as cached `lib/` functions inside Server Components when their output is part of the server-rendered shell. Client refetch and external clients still use `GET` routes, so the UI stays live.

A diff that adds a mutation should land as an action with the wallet check inside it. A diff that adds a client-side query should follow the polling pattern its neighbouring queries already use, a diff that seeds the server-rendered shell may read a cached `lib/` function directly, and a diff that mutates data should invalidate the query keys it affects.

## Every surface reaches the same seam

Sora has three surfaces: the web app, the MCP endpoint, and the CLI. The CLI is a thin MCP client, so the surfaces that carry the rules are the web app and the MCP endpoint, and both must reach the same `lib/` functions. The web app reaches them through server actions and `GET` routes; the MCP endpoint reaches them through the tools in `lib/mcp/`.

A rule that lives only in a server action is a rule an agent walks past, because agents drive the MCP endpoint. When a diff changes how money is read or written, it decides what happens on both paths. The seam is `lib/`, and the transports stay thin: a server action and an MCP tool decode their input, call one `lib/` function, and map the error.

The `lib/` function owns the rule. It validates the write it performs, and a transport's schema is a coarse filter that produces a usable error, not the rule itself. A rule written in one transport and missing from `lib/` is a rule the other transport does not have, and a rule the two transports spell differently is drift until someone says the difference is deliberate.

A helper is extracted when it names a concept. A single-use expression stays where it is used.

## Complexity needs a reason

Before a diff adds a check, a branch, a flag, or a layer for a race or an edge case, it names three things: the concrete failure, how likely it is, and what the complexity costs. A human agrees with those three before the complexity lands. A defensive branch that cannot name a failure is scope the diff did not need.

If a rule in this file fights the task in front of you, say so and get a human sign-off before breaking it. A rule here is a default, not a wall.

## Safety

Four rules protect the people whose money this app holds. They are one line each in `AGENTS.md` because they apply to every task, including the ones that touch no product code. This is what they mean and how to comply.

**Kill only what you started.** A dev server, a Postgres container, and a browser session all outlive the command that started them. Record the PID when you start a process and stop it by that PID. Matching on a name, a path, or a worktree string kills a sibling worktree's server, and `pkill -f` and `pgrep | kill` do it by pattern. The output looks identical either way, so the mistake is invisible from the terminal.

**Disposable databases only.** A verification run starts its own Postgres container (see the `verify-sora` skill). A database holding a real household's data is not a fixture, and a migration pointed at one is not a test.

**No machine-specific addresses in committed code.** A host, a port, and a secret belong in config or env. The documented local-dev defaults are the exception: `BETTER_AUTH_URL` in `.env.example`, the `NEXT_PUBLIC_SITE_URL` fallback in `app/layout.tsx`, and `DEFAULT_ENDPOINT` in `packages/sora-cli`. Anything else hardcoded is one developer's machine leaking into the repo.

**Invented households.** Tickets, commits, messages, and screenshots use households, names, and amounts that exist nowhere. The verification fixture household (`avery@sora.test`, `blake@sora.test`) is the shape: `.test` addresses, invented names, round numbers.

## Documentation

Documentation is for a decision and its reason, or a constraint that spans components. It is not a feature list, a field reference, or a record of what a diff did; the code and the tests already hold those.

A change that makes existing guidance inaccurate updates that guidance in the same change. When a documented decision changes, the affected text is rewritten or removed, not appended to. A new document needs a reason to exist that the code cannot carry.

Plans, research notes, and scratch files are not committed. `.scratch/` is gitignored for that reason.

## Copy reads plainly

Product copy is plain. A period, a comma, a colon, or parentheses where a dash would go, and no em dash in anything a user or an agent reads. The app should read like a person wrote it.

## A money diff walks a checklist

Before a diff that reads or writes money is called done, point at each of these:

1. Every query filters by `walletId`.
2. The filter is wallet scoped, with no private-row or cross wallet branch.
3. A transaction write moves the matching `MonthHistory` and `YearHistory` in the same `prisma.$transaction`.
4. Any date that names a bucket uses the UTC getters.
5. Any amount is formatted with `getFormatterForCurrency`.
6. A mutation is a server action with the wallet check inside it; a read is a cached `lib/` function, exposed through a `GET` route for client and external callers.
7. The mutation invalidates the query keys its change affects.
8. Both paths reach the change: the web action and the MCP tool.

Nothing here is new. It is the sections above gathered into the order a reviewer reads them, and a diff that fails one item is a finding. The checklist does not replace reading the diff.

## Types are inferred

Let the checker infer a type wherever it can. Annotate only where inference fails or where the type is the contract between two modules. `any` and `unknown` are not contracts. A caught error is the exception, and it is named `cause`. A boundary that receives an unparsed value parses it and names the type that comes out.

## Comments are a last resort

The default is none. A comment explaining what the code does is proof the code failed to say it itself: rename the symbol, extract the function, add a type, or restructure until the intent is obvious without prose. A surprise in our own code is the code's problem, not the reader's, and a comment is not the fix.

Five things survive. A legal or licence header. A non-obvious behaviour forced by an external dependency, platform, vendor, or protocol we cannot reshape. A `prettier-ignore`. A doc comment that defines a public API contract. A link to an issue or RFC for a constraint code cannot express.

Everything else dies, including the long justification: length is a confession, not a credential. When a rule here and a comment disagree about which is load-bearing, the comment loses.

The same bar governs suppressions. Look up the rule an `eslint-disable`, `@ts-ignore`, or `@ts-expect-error` silences. If it catches a real bug or protects correctness, remove the suppression and fix the code. A suppression survives only when the rule itself is faulty, pedantic, or style-only.

## Verify before committing

The working tree must pass the same checks CI runs. `pnpm run verify` is the source of truth for which checks those are.

The repo has no test suite, by decision (`docs/ROADMAP.md`). The build is the safety net for what compiles; behaviour is proved separately, by running the app.

Lint and format are mechanical, and the tools own them: `oxlint` reports the rules, `oxfmt` decides the layout. Run `pnpm lint` and `pnpm fmt` before committing, and let the formatter rewrite the file rather than hand-tuning whitespace or import order.

The rules that belong to the linter live in `packages/sora-lint-plugin`, so a rule that is mechanical is a rule there rather than a paragraph here.

A pre-commit hook runs these on every commit: it formats the staged files, then runs `pnpm run verify`. The build stays in CI, because it is the slow one.

A rule that fires on correct code gets fixed in the code, or, with a stated reason, in `.oxlintrc.json`. A scoped suppression comment is the last option, and only under the bar in "Comments are a last resort".

## Prove behaviour, do not assert it

A behaviour change is not finished until it has been seen running. Use the `verify-sora` skill to drive the real app against a disposable database and capture the run: the command, the value that came back, the side effect. Reading the source proves what the code says, not what the app does, and a green build does not see a hard budget refuse a transaction.

The skill's own rule holds here: never edit product code during a verification run. A behaviour that no longer matches the feature map is a finding to report, not a defect to patch mid-run.

## Commit protocol

One commit per ticket, on the branch the ticket is worked on. Conventional Commits: a type, a short subject, no body, no implementation chatter. The subject says what changed, not what you did.

Formatting is the one split. The formatter's commit is mechanical and lands on its own, so a reviewer can skip it and read the change underneath.

A ticket worked in the main session is committed after the session has read its own diff, and before the review a pull request carries. A ticket worked by a subagent commits on its own branch, because concurrent commits on one branch collide. A stack of branches wants a worktree each, so two of them cannot fight over the same checkout.

## Pull requests

A pull request is the end of a ticket, not a favour. One concern carries one pull request, and tickets that serve the same concern travel together.

The agent that worked the ticket commits and pushes the branch. A reviewer reads the diff after it is pushed, against the ticket's desired outcome, and the pull request opens once that review is clean. The order is commit, push, review, open.

The body is `.github/pull_request_template.md` filled end to end; every section answered, nothing deleted, nothing left as a prompt. The `pr` skill is how to write it well (picking Summary's one visual, what counts as evidence); the template is what the body must carry. Whatever the body says, a visual change attaches before and after captures to the pull request, never to the repository.

Attaching the captures is a CLI operation: `gh pr edit <n> --attach './before.png#the alt text'` uploads an image (or video) to the pull request, up to 50 files per command. `gh` rewrites matching local references in the body (`![alt](./before.png)`) to the uploaded asset URLs, and paths in a `--body-file` resolve relative to the file's directory, falling back to the working directory; absolute paths are not rewritten. Alt text is the part after `#`; without it, the filename is used. `--attach` alone keeps the existing body and appends the attachments to it. On older `gh` releases without the flag, attach in the web editor instead.

Squash merge is the only merge onto `main`, and a human owns it. The agent does not merge on its own; it opens the pull request and stops. A human approves the merge, or tells the agent to merge or to keep waiting, and the agent acts on that instruction alone. A pull request blocked on review, failing checks, or a one-way door is not merged either way; the agent says what it is waiting on instead of merging anyway. A pull request merged into a branch other than `main` is stacked on the one below it, and the stack merges from the bottom.

## Keeping this file honest

When a rule here contradicts the code, the code is what ships, so fix this file in the same change. When a rule here contradicts an ADR, surface the conflict rather than quietly picking one.
