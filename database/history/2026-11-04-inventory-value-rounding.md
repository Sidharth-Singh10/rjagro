# 2026-11-04 — Inventory relieved by value, not by rounded rate

## Why

`inventory-chicks` (ledger account 104) read **-8.86** while every chick lot was
empty and `inventory.current_qty` was 0. The account could not net to zero.

Chick purchases are billed as a rupee total over a bird count, so the per-bird
rate (`total / qty`) has no finite decimal expansion: `145999 / 3553 =
41.0917534…`. The purchase posted the exact bill total to inventory, but the lot
stored the rate as `numeric(12,2)` (`41.09`), and allocation relieved
`qty * unit_cost`. On every lot those two numbers disagreed by a few rupees:

| purchase | qty | stored rate | qty × rate | billed total | diff |
|---|---|---|---|---|---|
| 1 | 3553 | 41.09 | 145,992.77 | 145,999.00 | +6.23 |
| 5 | 2534 | 44.34 | 112,357.56 | 112,351.00 | −6.56 |
| 25 | 3503 | 51.71 | 181,140.13 | 181,125.00 | −15.13 |
| 52 | 2644 | 30.94 | 81,805.36 | 81,800.00 | −5.36 |

15 of the 16 chick lots carried a residual; they netted to −8.86. Feed was
unaffected because bags are priced at exact 2-dp rates, so `qty * rate` already
equalled the bill.

Rounding the rate to more decimals does not fix this — it only shrinks the error
(4 dp would have left 0.09, and would have flipped the sign), because no finite
decimal represents the rate. It also cannot be fixed by deriving the bill from
the rounded rate: the supplier is owed the bill, not `qty * rounded_rate`.

## What changed

Inventory is now relieved by **value**:

- A lot's book value is the purchase's exact `total_cost` (falling back to
  `received_qty * unit_cost` for lots with no purchase).
- A partial take is valued pro-rata against what is left on the lot.
- The take that empties a lot carries the exact remainder, so an exhausted lot
  relieves exactly what it cost and leaves nothing on the account.
- Returns restore what the allocation line actually took out: pro-rata for a
  partial return, the exact remainder for the return that reverses the line.

New module `src/handlers/lot_valuation.rs` (`relieve_lot`,
`return_value_for_line`), used by both allocation paths
(`batch_requirements.rs`, `batches.rs`) and by `process_stock_return`.

Money stays at 2 dp. `purchases.cost_per_unit` and `stock_receipts.unit_cost`
remain display/reporting rates; postings no longer depend on them.

## Data repair

`inventory_value_rounding_repair.sql` (applied 2026-11-04) repointed each fully
depleted chick lot's allocation line at its purchase total, carried the
difference into the paired `farm-expense` (107) entry and both
`ledger_accounts.current_balance` values, and refreshed the stored
`batch_closure_summary.gross_profit` derived from allocation values.

Result: account 104 = 0.00, account 107 reduced by 8.86, global debits still
equal credits. `metric_snapshots` were rebuilt by the app's backfill
(November `inventory_value` = 467,891.25, exactly the feed lots still on hand).

## Rollback

The repair is data-only. To revert it exactly, restore the 16 allocation line
values, the `batch_allocations.allocated_value` and `ledger_entries` pairs, and
the two account balances from the pre-repair backup; there is no schema to undo.
