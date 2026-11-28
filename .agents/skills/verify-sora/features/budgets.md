# Budgets

A budget is a per-category monthly limit with two modes. A soft budget warns when spending crosses 80% or 100% of the limit; a hard budget refuses the write before the transaction reaches the ledger.

## Sub-features

- `budget-soft-create` an owner or co-owner can create a soft budget; the card shows `0%` used after creation.
- `budget-soft-progress` the card shows how much of the month's expenses have been spent in the category.
- `budget-soft-warning` a soft budget notifies the other members at 80% and again at 100%, at most one notification per transaction.
- `budget-hard-create` an owner or co-owner can create a hard budget; a hard limit is enforced at the transaction seam.
- `budget-hard-reject` a transaction over the limit is refused with a derived message; no row is created.
- `budget-edit` an owner or co-owner can raise or lower the limit or switch mode.
- `budget-delete` an owner or co-owner can delete the budget; spent-vs-limit is no longer tracked; historical transactions stay.
- `budget-member-edits` an owner or co-owner can manage all budgets in the household; a viewer can only see them.
- `budget-wallet-scope` a transaction in another wallet does not count toward this wallet's budget.
- `budget-settlements-excluded` a settlement does not count toward any budget.

## How to get to it (user POV)

- Choose `Manage` in the top navigation, then scroll to the `Budgets` card.
- Read progress on the `Budgets` cards in that page.
- Set a category budget here or let an assistant do it with the `set_budget` MCP tool.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `$U`; `control-sora doctor` passes.
- The seeded household is in place (`control-sora reset`): 6 transactions, one soft budget (Groceries, $500, 320.50 spent), one goal.
- The browser is signed in as `avery@sora.test` (`control-sora login`).

- **Open the manage page.** Run `control-sora browser open "$U/manage"`. The heading reads `Manage`.
- **Read the existing budget.** Assert the Groceries card reads `Groceries`, the badge reads `soft`, and the text reads `$320.50 of $500 spent · $179.50 remaining · 64%`.
- **Create a hard budget.** Run `control-sora browser find role button click --name "Create budget"`, then `control-sora browser find role combobox click --name "Category"`, `control-sora browser find role option click --name "Utilities"`, `control-sora browser find label "Monthly limit" fill "100"`, `control-sora browser find role combobox click --name "Mode"`, `control-sora browser find role option click --name "Hard (block expenses over the limit)"`, and `control-sora browser find role button click --name "Create"`. The new card reads `Utilities`, the badge reads `hard` in lowercase, and the percentage reads `180%`, because the text shows the full percentage while only the progress bar is capped at 100.
- **Trigger the hard rejection.** Run `control-sora browser open "$U/"` then `New expense`, fill description `Utility spike` and amount `150`, pick `Utilities`, and click `Add`. The write is refused and the expense total in `control-sora mcp get_overview` stays `"1900.50"`. The toast carries the derived sentence with the limit, the amount already spent, and the resulting total.
- **The write did not happen.** The transactions table still reads 6 rows; the Utility spike is absent.
- **Clean up.** Delete the Utilities budget via the card's actions menu (`Open actions for Utilities budget` → `Delete` → `Delete budget`).
- **Proof.** Run `control-sora browser screenshot <artifact-dir>/budgets/manage.png`.

## Gotchas

- The manage card cannot create a budget for the `Settlement` category; the seeded UI excludes it. Only an owner or co-owner can create, edit, or delete a budget; a viewer sees them.
- The progress bar renders for every budget. Percentage text is `Math.round(percent)`, so an over-budget card reads more than 100% even though the bar is clipped.
- A budget card measures the current UTC month, with no per-budget month visibility switch. The hard-limit gate checks the transaction's own UTC month, so a backdated expense is compared with that month.
- A budget overspend only notifies the other members once per transaction, at the highest threshold crossed; the actor is not the only audience.
- The hard-cap rejection message reports the exact amounts from the server; do not pin that string for assertions.
- Utility budget is an example in this recipe; use another category if you reseed.
