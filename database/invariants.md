# Important Invariants

> Candidates discovered from code and schema structure. Each one is marked
> **needs verification** until its SQL check has been run against the live
> database. Only keep invariants that hold; record failures as debugging notes.

## INV-1 — Ledger entries balance per transaction group

**Statement:** For every `ledger_entries.txn_group_id`, total debits equal total credits.

**Evidence:** `src/handlers/traders.rs`, `src/handlers/batch_sales.rs`, `src/handlers/purchases.rs` write paired entries per transaction.

**Verification SQL:**

```sql
SELECT txn_group_id
FROM ledger_entries
GROUP BY txn_group_id
HAVING SUM(COALESCE(debit, 0)) <> SUM(COALESCE(credit, 0));
```

**Status:** verified 2026-09-18 — query returned zero rows against the live database.

## INV-2 — Inventory equals receipts minus allocations plus returns

**Statement:** `inventory.current_qty` matches the movement history.

**Evidence:** `stock_receipts`, `batch_allocation_lines`, `stock_returns`, `inventory_movements`.

**Verification SQL:**

```sql
SELECT i.item_code,
       i.current_qty,
       COALESCE(r.received, 0) - COALESCE(a.allocated, 0) + COALESCE(s.returned, 0) AS computed
FROM inventory i
LEFT JOIN (SELECT item_code, SUM(received_qty) AS received FROM stock_receipts GROUP BY item_code) r USING (item_code)
LEFT JOIN (SELECT sr.item_code, SUM(bal.qty) AS allocated
           FROM batch_allocation_lines bal JOIN stock_receipts sr ON sr.lot_id = bal.lot_id
           GROUP BY sr.item_code) a USING (item_code)
LEFT JOIN (SELECT sr.item_code, SUM(srt.return_qty) AS returned
           FROM stock_returns srt JOIN batch_allocation_lines bal ON bal.allocation_line_id = srt.allocation_line_id
           JOIN stock_receipts sr ON sr.lot_id = bal.lot_id
           GROUP BY sr.item_code) s USING (item_code)
WHERE i.current_qty <> COALESCE(r.received, 0) - COALESCE(a.allocated, 0) + COALESCE(s.returned, 0);
```

**Status:** verified 2026-09-18 — query returned zero rows against the live database.
Re-verified 2026-10-10 after the stock-return pricing: zero rows.

## INV-3 — Batch closure revenue equals recorded sales

**Statement:** `batch_closure_summary.revenue` equals the sum of `batch_sales.value` for the batch.

**Evidence:** `src/handlers/metrics.rs`, commit `be79691` (closure revenue computed from recorded sales).

**Verification SQL:**

```sql
SELECT bcs.batch_id, bcs.revenue, s.total
FROM batch_closure_summary bcs
JOIN (SELECT batch_id, SUM(value) AS total FROM batch_sales GROUP BY batch_id) s USING (batch_id)
WHERE bcs.revenue <> s.total;
```

**Status:** verified 2026-09-18 — query returned zero rows against the live database.

## INV-4 — Trader amount due formula

**Statement:** `amount_due = SUM(batch_sales.value WHERE payment_type='RECEIVABLE') − SUM(trader_payments.amount)`.

**Evidence:** `src/handlers/fetch_all.rs` (`get_traders_handler`).

**Verification SQL:**

```sql
SELECT t.trader_id,
       COALESCE(s.total, 0) - COALESCE(p.paid, 0) AS amount_due
FROM traders t
LEFT JOIN (SELECT trader_id, SUM(value) AS total FROM batch_sales WHERE payment_type = 'RECEIVABLE' GROUP BY trader_id) s USING (trader_id)
LEFT JOIN (SELECT trader_id, SUM(amount) AS paid FROM trader_payments GROUP BY trader_id) p USING (trader_id);
```

**Status:** verified 2026-09-18 — formula matches `get_traders_handler`; the query
returns the live per-trader balances (they change as payments are recorded, so do
not hardcode sample values).

## INV-5 — Stock returns never exceed their allocation line

**Statement:** For every `batch_allocation_lines` row, `SUM(stock_returns.return_qty)`
is at most `qty`, and `stock_returns.batch_id` equals the line's `batch_id`. The
create endpoint enforces both (`src/handlers/batch_requirements.rs`,
`process_stock_return`); the delete endpoint refuses to reverse a return whose
quantity is no longer available in the lot.

**Evidence:** `src/handlers/batch_requirements.rs` (cumulative cap + batch check),
`src/handlers/fetch_by_id.rs` (`get_returnable_allocation_lines_handler`).

**Verification SQL:**

```sql
SELECT bal.allocation_line_id,
       bal.batch_id,
       bal.qty AS allocated_qty,
       COALESCE(SUM(sr.return_qty), 0) AS returned_qty
FROM batch_allocation_lines bal
LEFT JOIN stock_returns sr ON sr.allocation_line_id = bal.allocation_line_id
GROUP BY bal.allocation_line_id, bal.batch_id, bal.qty
HAVING COALESCE(SUM(sr.return_qty), 0) > bal.qty;

SELECT sr.return_id
FROM stock_returns sr
JOIN batch_allocation_lines bal ON bal.allocation_line_id = sr.allocation_line_id
WHERE bal.batch_id IS NOT NULL
  AND sr.batch_id <> bal.batch_id;
```

**Status:** verified 2026-10-10 — both queries returned zero rows after correcting
two historical over-returns (return 3 on line 48 and return 6 on line 55).

## INV-6 — A depleted lot relieves exactly what it cost

**Statement:** For every `stock_receipts` row with `remaining_qty = 0`, the value
relieved by its allocation lines equals the purchase's `total_cost` plus the value
put back by returns. Inventory is relieved by *value*, not by
`qty * stock_receipts.unit_cost`: chick bills are quoted as a rupee total over a
bird count, so the stored 2-dp rate is only an approximation and multiplying it
out leaves a rounding stub behind on every lot.

**Evidence:** `src/handlers/lot_valuation.rs` (`relieve_lot`,
`return_value_for_line`), used by `src/handlers/batch_requirements.rs` and
`src/handlers/batches.rs`. Historical lots were repointed by
`inventory_value_rounding_repair.sql`.

**Verification SQL:**

```sql
SELECT
    sr.lot_id,
    p.total_cost AS purchased,
    COALESCE((SELECT SUM(line_value) FROM batch_allocation_lines WHERE lot_id = sr.lot_id), 0) AS relieved,
    COALESCE((SELECT SUM(srt.return_value)
              FROM stock_returns srt
              JOIN batch_allocation_lines bal ON bal.allocation_line_id = srt.allocation_line_id
              WHERE bal.lot_id = sr.lot_id), 0) AS returned
FROM stock_receipts sr
    JOIN purchases p ON p.purchase_id = sr.purchase_id
WHERE sr.remaining_qty = 0
  AND ROUND(COALESCE((SELECT SUM(line_value) FROM batch_allocation_lines WHERE lot_id = sr.lot_id), 0), 2)
      <> ROUND(p.total_cost + COALESCE((SELECT SUM(srt.return_value)
                                        FROM stock_returns srt
                                        JOIN batch_allocation_lines bal ON bal.allocation_line_id = srt.allocation_line_id
                                        WHERE bal.lot_id = sr.lot_id), 0), 2);
```

**Status:** verified 2026-11-04 — query returned zero rows after the repair.
Before the repair all 15 chick lots with a rounding residual showed up here, and
`inventory-chicks` (104) read -8.86 with no birds in stock.

## How to add an invariant

1. State it in one sentence and cite the evidence (file path or commit).
2. Include a verification query that returns offending rows.
3. Run it; record the result and the date; only then mark it verified.
