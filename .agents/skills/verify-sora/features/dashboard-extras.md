# Dashboard extras

Beyond totals and the ledger, the dashboard shows the household's own derived numbers, what is coming due, its in-app notifications, and the prompt to install Sora as a home-screen app.

## Sub-features

- `insights-savings-rate` the current month's savings rate, with a comparison to the previous month.
- `insights-trend` a six-month chart and table of income and expense from the monthly rollups.
- `safe-to-spend` the sum of the remaining amounts of this month's budgets, with an invitation to set a budget when there are none.
- `upcoming-bills` recurring items due or past due, with a prefilled transaction dialog when one is tapped.
- `notifications` the bell menu lists in-app notifications and their read state.
- `install-prompt` the page offers to add Sora to the home screen for quick access and offline balances, and the prompt can be dismissed.
- `offline-writes` excluded: see the Transactions gotchas for the typed mutation client and idempotent replay.

## How to get to it (user POV)

- Open `/` and scroll through the dashboard.
- Tap the bell in the top navigation for notifications.
- Tap `Install` in the `Install Sora` card, or `Dismiss install prompt` to hide it.
- Tap an upcoming bill to open a prefilled transaction dialog.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `$U`; `control-sora doctor` passes.
- The seeded household is in place (`control-sora reset`): two members, one soft budget, one goal, no recurring items and no notifications.
- The browser is signed in as `avery@sora.test` (`control-sora login`).

- **Open the dashboard.** Run `control-sora browser open "$U/"`. The `Insights` card shows `Savings rate`, the current month, and `Income and expense trend over the last 6 months` with a small table of monthly rows. The minimal fixture has no previous month, so the comparison reads `– pt vs October`.
- **Safe to spend.** The card reads `Safe to spend` and `Left across your budgets this month`, with the sum of the current month's remaining budget amounts. With no budgets it invites the household to set one instead of showing a number.
- **Upcoming bills.** The card reads `Upcoming bills` and `Recurring income and expenses, due or past due`. With the minimal fixture it shows `Add your first recurring bill or paycheck to get started.` A seeded recurring item can be tapped to open a prefilled transaction dialog.
- **Notifications.** Run `control-sora browser find role button click --name "Notifications"`. The menu opens and reads `No notifications yet`. `control-sora browser eval 'fetch("/api/notifications").then(r=>r.json()).then(d=>JSON.stringify(d))'` returns `[]`.
- **Install prompt.** The card reads `Install Sora` and `Add Sora to your home screen for quick access and offline balances.` Buttons `Install` and `Dismiss install prompt` are present. Dismissing hides the card for the session.
- **Proof.** Run `control-sora browser snapshot -i` and `control-sora browser screenshot <artifact-dir>/dashboard-extras/dashboard.png`.

## Gotchas

- The six-month series belongs to Insights, not History. History buckets by day for a month or by month for a year.
- With no rollup for the previous month the savings-rate comparison shows a dash, not a number. The average fixture supplies several months and makes the comparison meaningful.
- Upcoming bills come from recurring items; nothing posts automatically. The tap opens a dialog that the member confirms or adjusts.
- Notifications are in-app only. Their payloads carry no amount beyond what the recipient can already see.
- The install prompt is a page card, not a browser dialog. Dismissal is session-level, so a fresh browser session shows it again.
