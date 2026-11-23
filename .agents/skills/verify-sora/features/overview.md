# Overview

The dashboard is where a household sees the month's shared numbers at a glance: the stat cards, the shared spending card, the category breakdowns, the history chart, and the insights panel.

## Sub-features

- `overview-income-expense-net` the stat cards show Income, Expense, and Balance for the picked date range; Balance is the server-computed net.
- `overview-by-category` both category lists show shared transactions for the picked range, with the largest first.
- `overview-balance` the balance card shows the net of shared transactions and settlements.
- `overview-shared-spending` a separate card shows this month's shared spend and the change against last month.
- `overview-history` a chart of daily income and expense for the selected month, or twelve monthly buckets for the selected year, with previous/next chevrons.
- `overview-insights` the savings rate for the current month and a six-month trailing chart of income vs expense.
- `overview-savings-goal` excluded: see Goals.

## How to get to it (user POV)

- Open `/` for a direct link to the dashboard.
- Pick a date range with the picker; the default is month-to-date.
- Toggle `Month` / `Year` on the history chart.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `$U`; `control-sora doctor` passes.
- The seeded household (`control-sora reset`) is in place, with two members.
- The browser is signed in as `avery@sora.test` (`control-sora login`).

- **Open the dashboard.** Run `control-sora browser open "$U/"`. The heading reads `Hello, Avery!`; the stats render; the shared-spending card reads `Shared spending this month`, its amount, and a `more`/`less than last month` line. It does not show a limit or a remaining figure.
- **Read the stats.** Run `control-sora browser get text body`. Assert `Income` `$5,000`, `Expense` `$1,900.50`, `Balance` `$3,099.50`. The category lists show `Salary $5,000` and the five expense categories.
- **Change the range.** Before a preset is picked the trigger shows today's date. Click that trigger, then click `This Month`. The trigger now reads the first of the month through today, for example `Nov 1, 2026 - Nov 22, 2026`. Use the current date, not a pinned day.
- **Toggle the history granularity.** Run `control-sora browser find role tab click --name "Year"`. The label reads `2026` and the buckets are months. Run the same with `Month` for daily buckets.
- **Proof.** Run `control-sora browser snapshot -i` and `control-sora browser screenshot <artifact-dir>/overview/dashboard.png`.
- **MCP.** `control-sora mcp get_overview` → returns `income` `"5000.00"`, `expenses` `"1900.50"`, `net` `"3099.50"` as fixed-2-decimal strings, not currency-formatted numbers.

## Gotchas

- Totals count only `shared: true` transactions (all inclusive), from any member.
- The category lists are not zero-filled: a category with no shared transaction in the range does not appear; an empty range shows `No data for the selected period`.
- Settlement transactions are excluded from the shared-spending card and the category breakdowns, but the balance-stats totals do include them.
- A solo household has no shared-spending card; the card renders only when memberCount > 1.
- The date range is capped at 90 days; a wider range is refused by the picker with a toast.
- The picker trigger shows today's date on first load. After picking `This Month` it shows the full range. Use the live date in assertions.
- Personal transactions do not contribute to any of these numbers.
