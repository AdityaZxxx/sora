# Dashboard extras

Beyond totals and the ledger, the dashboard shows the household's own derived numbers, what is coming due, its in-app notifications, and the prompt to install Sora as a home-screen app.

## Sub-features

- `insights-savings-rate` the current month's savings rate, with a comparison to the previous month.
- `insights-trend` a six-month chart of income and expense from the monthly rollups, with a screen-reader-only monthly table.
- `safe-to-spend` the sum of the remaining amounts of this month's budgets, with an invitation to set a budget when there are none.
- `upcoming-bills` recurring items due or past due, each with a `Post` button that opens a prefilled transaction dialog.
- `notifications` the bell menu lists in-app notifications and their read state.
- `install-prompt` a fixed aside offers to add Sora to the home screen for quick access and offline balances, and dismissal persists in localStorage.
- `offline-writes` excluded: see the Transactions gotchas for the typed mutation client and idempotent replay.

## How to get to it (user POV)

- Open `/` and scroll through the dashboard.
- Tap the bell in the top navigation for notifications.
- Tap `Install` in the `Install Sora` aside, or `Dismiss install prompt` to hide it.
- Tap `Post` on an upcoming bill to open a prefilled transaction dialog.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `$U`; `control-sora doctor` passes.
- The seeded household is in place (`control-sora reset`): two members, one soft budget, one goal, no recurring items and no notifications. For the billing journey, use `control-sora launch --average` or `control-sora reset --average`, which seeds five recurring items.
- The browser is signed in as `avery@sora.test` (`control-sora login`).

- **Open the dashboard.** Run `control-sora browser open "$U/"`. The `Insights` card shows `Savings rate`, the current month, and an `Income vs expense` card described as `Last six months`. The chart's accessible name is `Income and expense trend over the last 6 months`; its monthly table is screen-reader-only. The minimal fixture has zero income in the previous month, so the comparison reads `– pt vs October`.
- **Safe to spend.** The card reads `Safe to spend` and `Left across your budgets this month`, with the sum of the current month's remaining budget amounts. With no budgets it invites the household to set one instead of showing a number.
- **Upcoming bills.** The card reads `Upcoming bills` and `Recurring income and expenses, due and past due`. With the minimal fixture it shows `Add your first recurring bill or paycheck to get started.` With the average fixture, click `Show all (5)` to list all five bills even when none is due today. Each row has a `Post` button.
- **Post a bill.** Run `control-sora browser find nth 1 'button[data-slot="dialog-trigger"]:not([hidden])' click` on the average fixture. The dialog is prefilled with Rent, amount `1,450` and category `Rent`. Click `Add`; the toast reads `Transaction added` and `control-sora mcp get_overview` shows expenses rising by that bill's amount. `control-sora mcp list_transactions` with a range covering today lists the new Rent expense, and the recurring item's `lastPostedAt` moves to today in the database.
- **Notifications.** Run `control-sora browser find role button click --name "Notifications"`. The menu opens and reads `No notifications yet`. `control-sora browser eval 'fetch("/api/notifications").then(r=>r.json()).then(d=>JSON.stringify(d))'` returns `[]`.
- **Install prompt.** A fixed aside reads `Install Sora` and `Add Sora to your home screen for quick access and offline balances.` Buttons `Install` and `Dismiss install prompt` are present. Dismissing writes `sora:install-dismissed` to localStorage and hides the aside across sessions.
- **Proof.** Run `control-sora browser snapshot -i` and `control-sora browser screenshot <artifact-dir>/dashboard-extras/dashboard.png`.

## Gotchas

- The six-month series belongs to Insights, not History. History buckets by day for a month or by month for a year.
- With zero income in the previous month the savings-rate comparison shows a dash, not a number. The average fixture supplies several months and makes the comparison meaningful.
- Upcoming bills come from recurring items; nothing posts automatically. The `Post` button opens a dialog that the member confirms or adjusts.
- Notifications are in-app only. Their payloads carry no amount beyond what the recipient can already see.
- The install prompt is a fixed aside, not a browser dialog or a page card. Dismissal persists in localStorage, so a fresh browser session keeps it hidden.
