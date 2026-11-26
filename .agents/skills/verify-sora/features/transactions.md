# Transactions

The transactions page is the household ledger. It lists income and expense rows, lets the member filter them, export them as CSV, and delete them. New transactions are added from the dashboard.

## Sub-features

- `transactions-list` shows one row per transaction with category, description, added-by, date, type, amount, and an optional `Via agent` badge.
- `transactions-filter-category` narrows the table to a single category.
- `transactions-filter-type` narrows to income or expense.
- `transactions-export` downloads every transaction in the date range as CSV, ignoring active filters and pagination, with headers Date, Category, Description, Type, Amount, Currency.
- `transactions-add` opens a dialog on the dashboard to create a new transaction with optional split shares.
- `transactions-delete` deletes a transaction after a confirmation.
- `transactions-paging` lets the member pick rows per page and page through.
- `transactions-clipboard` nothing; visible columns are per-page pickers.

## How to get to it (user POV)

- Choose `Transactions` in the top navigation.
- Open `/transactions` directly.
- Add from the dashboard with the `New expense` / `New income` button.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `$U`; `control-sora doctor` passes.
- The seeded household is in place (`control-sora reset`): 6 transactions, one income and five expenses.
- The browser is signed in as `avery@sora.test` (`control-sora login`).

- **Open the table.** Run `control-sora browser open "$U/transactions"`. The heading reads `Transactions`.
- **Read the rows.** Run `control-sora browser eval 'document.querySelectorAll("tbody tr").length'`. Six rows. The body shows `Salary` `Monthly Salary` `+$5,000`, `Rent` `-$900`, `Groceries` `-$320.50`, `Travel` `-$300`, `Utilities` `-$180`, `Dining Out` `-$200`. Avery's rows say `You`; Blake's rows say `added by Blake Rivera`. The UI title-cases descriptions, so `Weekly groceries` renders as `Weekly Groceries`.
- **Filter by category.** Run `control-sora browser find role button click --name "Category"` (the filter above the table, not the column header), then `control-sora browser find role option click --name "🛒 Groceries"`. One row left; a `Clear filters` entry appears. Run the same with `Type` → `Expense` → `Salary` goes; five remain.
- **Add a transaction.** Open `$U/`, run `control-sora browser find role button click --name "New expense"`, fill `Description` `Coffee run`, `Amount` `12.50`, pick `Dining Out`, click `Add`. Toast `Transaction added`. A `How this expense is split` control appears for expenses in a multi-member household.
- **Delete it.** Open `$U/transactions`. Open the row's actions with a snapshot ref for `Open actions` on the `Coffee Run` row, then `control-sora browser find role menuitem click --name "Delete"`, and confirm `Delete transaction`. Toast `Transaction deleted`; 6 rows remain.
- **Export CSV.** Hook the blob (`control-sora browser eval 'window.__csv=null;const o=URL.createObjectURL.bind(URL);URL.createObjectURL=b=>{b.text().then(t=>{window.__csv=t});return o(b)}'`), click `Export CSV` via a snapshot ref, and eval `window.__csv`. The text starts with `Date,Category,Description,Type,Amount,Currency` and contains one line for every transaction in the date range. Dates use the short display form, for example `"Nov 20, 2026",Groceries,Weekly groceries,Expense,-$320.50,USD`; the description is the raw seed text, not the title-cased UI text.
- **Date range.** Click the range button to see the picker. Before a preset is picked it shows today's date; after `This Month` it shows the first of the month through today. A range wider than 90 days refuses with a toast.
- **Proof.** Run `control-sora browser snapshot -i` and `control-sora browser screenshot <artifact-dir>/transactions/table.png` before the mutation, and again after the deletion.

## Gotchas

- The column header buttons (`Category`, `Type`) share their names with the filter buttons above the table. The filter wins on `find role button click --name` because it comes first in the DOM; scope the click with a snapshot ref if the order changes.
- Every transaction belongs to the active wallet. Split controls appear only when the wallet has more than one member.
- The dialog's `Goal (optional)` select appears only on the expense dialog, and only when at least one goal exists.
- `Delete` is only shown on rows the member can edit (full members only).
- The table does not poll. `POLL_INTERVAL` is 0 and `staleTime` is 30 s; new rows arrive through SSE invalidation of the transactions query key. If a row does not appear, wait briefly or reload rather than waiting a fixed 30 s.
- Web writes use a typed mutation client with a generated idempotency key, optimistic stats update and rollback, and an IndexedDB queue for offline replay. An online write still surfaces the server error as a toast.
