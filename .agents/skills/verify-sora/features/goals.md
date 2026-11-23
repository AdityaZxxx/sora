# Goals

A goal is a named household savings target with an optional deadline. It holds no money; each goal's progress is the sum of shared transactions tagged with that goal.

## Sub-features

- `goals-create` a full member can create a goal with a name, a target, and an optional deadline.
- `goals-edit` a full member can rename a goal, change its target, or set or clear its deadline.
- `goals-delete` a full member can delete a goal; transactions tagged with it stay in the ledger with the tag cleared.
- `goals-progress` the card shows the percentage and the contributed and target amounts.
- `goals-reached-notify` reaching the target fires a one-shot `goal_reached` notification to all members when a shared transaction crosses the line.
- `goal-tag-transaction` a transaction can be tagged with a goal when adding it.
- `goals-list-mcp` list goals with the MCP surface; amounts are fixed-2-decimal strings.

## How to get to it (user POV)

- Choose `Dashboard` in the top navigation.
- Use the `New goal` button on the dashboard.
- Use the `Open actions` menu on a row to Edit or Delete the goal.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `$U`; `control-sora doctor` passes.
- The seeded household is in place (`control-sora reset`): one goal `Vacation` (target $2,000, deadline 2027-06-01, contributed $300 via `Vacation fund`).
- The browser is signed in as `avery@sora.test` (`control-sora login`).

- **Open the dashboard.** Run `control-sora browser open "$U/"`. The Goals card shows `Vacation`, `by June 1st, 2027`, the progress bar, and the line `15% · $300 of $2,000`. The bar comes before that line.
- **Create a goal.** Run `control-sora browser find role button click --name "New goal"`; the dialog reads `Add a goal`. Fill `Name` `Bike`, `Target amount` `800`, then `control-sora browser find role button click --name "Add"`. The row reads `0% · $0 of $800`.
- **Tag a transaction to it.** Run `New expense` and tag `Bike` in `Goal (optional)`; pick `Dining Out`, fill `$50`, click `Add`. The `Bike` row reads `6% · $50 of $800`.
- **Update the target.** Open the actions for the Bike goal, `Edit goal`; set `Target amount` `800` → `600` and save. The percentage line changes accordingly.
- **Delete the goal.** Open the actions for the Bike goal, click `Delete`; the dialog reads `Delete goal "Bike"?`. Confirm with the `Delete goal` button; the row is gone.
- **MCP.** `control-sora mcp list_goals '{}'` returns the seeded goal with `target` `"2000.00"` and `contributed` `"300.00"`. Goal writes also take decimal strings.
- **Proof.** Run `control-sora browser snapshot -i` and `control-sora browser screenshot <artifact-dir>/goals/dashboard.png`.

## Gotchas

- The `Goal (optional)` select is only offered on the expense dialog and only when at least one goal exists; income transactions can never be tagged with a goal.
- `goal_reached` fires once, when the shared transaction takes the goal over the line; later shared transactions never fire it again.
- Tagging a transaction does not move any money; it is a label.
- The progress bar always shows base progress, capped at 100%; an over-target goal reads at 100%.
- Deleting a goal nulls the goal tag on its transactions; the money stays in the ledger. The confirm button is `Delete goal`, not `Remove from ledger`.
