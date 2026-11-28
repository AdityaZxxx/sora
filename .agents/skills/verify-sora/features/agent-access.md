# Agent access

Agent access is the wallet's switch for programmatic use. Any member can mint a user owned API token on Account Settings. Each token lists the wallets it may reach and an access level. Effective access is the intersection of that list and the member's current role in each wallet.

## Sub-features

- `agent-access-switch` turns programmatic access on and off per wallet from Account Settings.
- `agent-access-tokens` lists the caller's tokens with their allowed wallets and effective access.
- `agent-access-create` creates a token with a chosen wallet list and scope.
- `agent-access-revoke` revokes a token; `agent-access-revoke-own` for a viewer.
- `agent-access-role-gate` a viewer's token is read only; after a demotion the write tools stay registered but every write call is rejected immediately.
- `agent-access-wallet-gate` a token scoped to one wallet cannot reach another, including through the CLI `--wallet` flag or the `X-Sora-Wallet` header.

## How to get to it (user POV)

- Choose `Account` in the top navigation.
- Agent access and token management live here, not on Manage.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `$U`; `control-sora doctor` passes.
- The seeded wallet is in place (`control-sora reset`): Avery is owner, Blake is member, agent access is on, and Avery has a read-write and a read-only token.

- **Open Account Settings.** Run `control-sora browser open "$U/account"` and snapshot the page. The Agent access card lists each wallet with its switch, and the token list shows allowed wallets and effective access.
- **Create a token.** Fill `Token name`, choose a scope, select the wallets, click `Create token`, and copy the one-time plaintext value.
- **Use the token.** `control-sora mcp get_overview '{}'` uses Avery's read-write token. For a token with several wallets, pass `--wallet <id>` to `control-sora cli` or send the `X-Sora-Wallet` header. `control-sora mcp` does not forward that flag. A wallet outside the list returns a 403.
- **Demote.** Change the member's role on Manage. The token's effective access on Account Settings changes after refetch, and write tools reject immediately.
- **Proof.** `control-sora browser screenshot <artifact-dir>/agent-access/account.png` and `browser snapshot -i`.

## Gotchas

- MCP is stateless JSON, so there is no SSE on this surface.
- Turning agent access off revokes every token that lists that wallet.
- A read-only token sees eight read tools: `get_overview`, `list_transactions`, `get_balances`, `list_budgets`, `list_goals`, `list_members`, `list_categories` and `list_settlements`. A read-write token sees twenty tools in all, adding twelve write tools.
- `control-sora cli` uses `SORA_TOKEN` by default; pass `--wallet` when a token lists more than one wallet.
