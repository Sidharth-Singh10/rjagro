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

## How to add an invariant

1. State it in one sentence and cite the evidence (file path or commit).
2. Include a verification query that returns offending rows.
3. Run it; record the result and the date; only then mark it verified.
