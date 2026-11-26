# Balances and settlements

Balances answer who owes whom relative to the caller. They are net of expenses and settlements; a settlement records one member paying another member back. No money moves inside the app.

## Sub-features

- `balances-list` shows the net amount between the caller and every other member.
- `balances-direction` says who owes whom and by how much.
- `balances-shared-spending` shows what the household spent together for the picked month.
- `balances-settlement` records that the caller paid another member back.
- `balances-settlement-record` settlements are first class records; they do not count towards wallet totals or budgets.
- `balances-simplify` the fewest transfers that settle every member (listed only for three or more members).

## How to get to it (user POV)

- The `Balances` card sits on the dashboard; the `Record settlement` button opens the dialog.
- The `Simplify debts` card sits below Balances; it only renders for three or more members.
- Record a settlement from the dashboard.
- Record one from an assistant with the `record_settlement` MCP tool.
- Read balances via the `/api/balances` route or `control-sora mcp get_balances`.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `$U`; `control-sora doctor` passes.
- The seeded household is in place (`control-sora reset`): two members and six transactions, all in the current month, with no settlement recorded yet.
- For the dashboard view, sign in as Blake (`control-sora login --as member`). The MCP token belongs to Avery, so MCP rows are from Avery's perspective.

- **Open the dashboard.** Run `control-sora browser open "$U/"`. The `Balances` card reads `You owe $870.25`.
- **Record a settlement.** Run `control-sora browser find role button click --name "Record settlement"`. The `Member` combobox lists the other members; choose Avery Quinn, fill `Amount` `100`, click `Record`. The toast reads `Settlement recorded`.
- **See the change.** Reload the dashboard; the card reads `You owe $770.25`. `mcp get_balances` returns `"620.25"` for Blake from Avery's perspective. The settlement is a first class record and no longer appears in `/transactions`.
- **MCP.** Run `control-sora mcp get_balances '{}'` with the Avery token. The result is `{currency, balances: [{memberId, memberName, balance, status}]}`. The row for `Blake Rivera` has `balance` `"-870.25"` as a fixed-2-decimal string and `status` `they_owe_you` before the settlement.
- **Clean up.** Run `control-sora reset` to restore the seeded ledger, then sign in again.
- **Proof.** `control-sora browser screenshot <artifact-dir>/balances/card.png` and `browser snapshot -i`.

## Gotchas

- The shared-spending card and the `Balances` card show different things: one tracks expense totals, the other the net of who owes whom.
- Settlements are records with a payer, receiver, amount and date. They do not appear in the wallet totals, category stats, or budgets.
- The card is only shown on a household with 2+ members; a solo household never sees it.
- Changes are pushed over SSE and the client invalidates its queries; there is no 30-second poll. In this run the balance card needed a page reload before it showed the new number, so do not assert instant refresh.
- MCP `get_balances` signs the other member's balance from the caller's perspective: negative means that member owes the caller, and the amount is a string such as `"-870.25"`.
- The caller is filtered out of the MCP balance list, so with Avery's token the only row is Blake.
