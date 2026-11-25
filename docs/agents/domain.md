# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root
- **`docs/adr/`**: read ADRs that touch the area you're about to work in

This repo is **single-context**: one glossary and one ADR directory at the root.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-household-scoped-data-model.md
│   ├── 0002-free-forever-zero-cost.md
│   └── 0003-invite-by-revocable-link.md
├── app/          pages, GET read routes, and write actions
├── components/   React components
├── hooks/        client hooks
├── lib/          the domain functions every surface reaches
├── packages/     sora-cli and sora-lint-plugin
├── prisma/       the schema and its migrations
├── schemas/      the zod contracts the transports validate with
└── proxy.ts
```

## Canonical read path

The dashboard resolves its household once in the private cached `getDashboardContext` in `app/(dashboard)/_lib/dashboard-context.ts` and passes the context to both streamed regions. Initial page data comes from four RSC loaders hydrated into TanStack Query: `loadDashboard` in `app/(dashboard)/_lib/dashboard-loader.ts`, `SeededDashboardShell` in the shared dashboard layout, `SeededManage`, and `SeededTransactions`. Each seeds tagged `lib/` reads, so the first client render has data without a fetch. The shell owns the household list, notifications, and members so each key has one seed source; the page loaders add only their own reads.

Overview is the exception among dashboard sections: its Server Component calls the household-scoped cached stat readers in `lib/transactions` and passes the figures to TanStack Query as `initialData`, so they are in the server HTML and the query layer owns updates after first paint. Those two reads stay out of `loadDashboard` on purpose, because adding them to the blocking payload would make every section wait for them. Overview query keys include the household id, so a cached entry from another household cannot seed the current household's figures. Writes and SSE still invalidate the same `overview` key prefixes, so hydrated history and streamed stats refresh together. Every later client-side read and refetch goes through a `GET` route under `app/api/*`, including refetches triggered by SSE invalidation. Server Actions are for writes only. `/api/*` also serves external clients: MCP, CLI, export, cron and auth.

The route wrappers are thin. Each one calls the same `lib/` seam the loaders and external clients call, and returns through `jsonReadResponse` in `lib/api-route.ts` so ETag and Cache-Control stay centralised. `/api/households` is deliberately always fresh: its polling clients must see membership changes immediately, so it uses the uncached seam while the seeded loaders use the tagged cached one. The loaders, the routes, and the SSE effects call the same `lib/` reads, and a mutation invalidates the cache tags those reads carry. Query keys in `lib/query-keys.ts` give the client one identity for each read, so a refetch lands in the cache entry the seeded state created. Member count is a field of the household list, not a separate query.

The cached household list is tagged per member as well as per household. The member-level tag covers households a member does not hold yet, so joining, leaving, removing a member, and creating a household invalidate the seeded list even when the affected household was not cached before. The shared dashboard layout seeds the household list once and wraps the page, so the navbar and the manage reads hydrate the same entry.

Seeded loaders share the UTC date calendar with the dashboard and the rollups. The transactions view takes its first range from `resolveDateRange()` and carries it as UTC day strings, the same strings the client sends on refetch and the route parses back into UTC dates. A local-time reformat of a UTC boundary would shift the range by a day at a negative offset and split the seeded page from the month the app counted.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
