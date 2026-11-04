-- Inventory value rounding repair
--
-- Every chick lot is bought for a rupee total over a bird count, so the
-- per-bird rate has no finite decimal expansion. The purchase posted the exact
-- total to `inventory-chicks` (104) while allocation relieved
-- `qty * round2(rate)`, leaving a rounding stub behind on every lot. Once all
-- 16 chick lots were empty the account still read -8.86.
--
-- This repoints each fully depleted lot's allocation at exactly what the lot
-- cost, carries the difference into the paired `farm-expense` (107) entry and
-- both account balances, and refreshes the stored batch profit that is derived
-- from allocation values.
--
-- Semantics: for a lot with `remaining_qty = 0` and no returns, the value
-- relieved must equal the purchase's total cost. Lots with stock left on them
-- are untouched — the application now values them pro-rata and flushes the
-- remainder when they empty.

DO $$
DECLARE
    lot RECORD;
    allocation RECORD;
    batch RECORD;
    value_delta NUMERIC;
    batch_expense NUMERIC;
BEGIN
    -- 1. Re-value each emptied chick lot's allocation lines so the lot relieves
    --    exactly what it cost. All chick lots are drawn down in a single line;
    --    the remainder is parked on the last line to keep this general.
    FOR lot IN
        SELECT
            MAX(bal.allocation_line_id) AS last_line_id,
            p.total_cost - COALESCE(SUM(bal.line_value), 0) AS delta
        FROM stock_receipts sr
            JOIN purchases p ON p.purchase_id = sr.purchase_id
            JOIN items i
                ON i.item_code = sr.item_code
               AND i.item_category = 'chicks'
            JOIN batch_allocation_lines bal ON bal.lot_id = sr.lot_id
        WHERE sr.remaining_qty = 0
        GROUP BY sr.lot_id, p.total_cost
        HAVING ROUND(p.total_cost - COALESCE(SUM(bal.line_value), 0), 2) <> 0
    LOOP
        UPDATE batch_allocation_lines
        SET line_value = line_value + lot.delta
        WHERE allocation_line_id = lot.last_line_id;
    END LOOP;

    -- 2. Push corrected allocation values into the ledger pair and the
    --    account balances. The inventory credit and the expense debit are the
    --    two sides of the allocation, so they move together.
    FOR allocation IN
        SELECT
            bal.allocation_id,
            SUM(bal.line_value) AS new_value,
            credit.entry_id AS credit_entry_id,
            credit.credit AS old_credit,
            credit.txn_group_id AS txn_group_id
        FROM batch_allocation_lines bal
            JOIN ledger_entries credit
                ON credit.account_id = 104
               AND credit.reference_table = 'allocations'
               AND credit.reference_id = bal.allocation_id
        WHERE bal.lot_id IN (
            SELECT sr.lot_id
            FROM stock_receipts sr
                JOIN items i
                    ON i.item_code = sr.item_code
                   AND i.item_category = 'chicks'
            WHERE sr.remaining_qty = 0
        )
        GROUP BY
            bal.allocation_id,
            credit.entry_id,
            credit.credit,
            credit.txn_group_id
        HAVING SUM(bal.line_value) <> credit.credit
    LOOP
        value_delta := allocation.new_value - allocation.old_credit;

        UPDATE ledger_entries
        SET credit = allocation.new_value
        WHERE entry_id = allocation.credit_entry_id;

        UPDATE ledger_entries
        SET debit = allocation.new_value
        WHERE txn_group_id = allocation.txn_group_id
          AND account_id = 107
          AND debit IS NOT NULL;

        UPDATE batch_allocations
        SET allocated_value = allocation.new_value
        WHERE allocation_id = allocation.allocation_id;

        UPDATE ledger_accounts
        SET current_balance = current_balance - value_delta
        WHERE account_id = 104;

        UPDATE ledger_accounts
        SET current_balance = current_balance + value_delta
        WHERE account_id = 107;
    END LOOP;

    -- 3. A batch's expenses are derived from its allocation line values, so the
    --    stored profit has to follow the same correction.
    FOR batch IN
        SELECT DISTINCT bal.batch_id
        FROM batch_allocation_lines bal
        WHERE bal.lot_id IN (
            SELECT sr.lot_id
            FROM stock_receipts sr
                JOIN items i
                    ON i.item_code = sr.item_code
                   AND i.item_category = 'chicks'
            WHERE sr.remaining_qty = 0
        )
    LOOP
        SELECT COALESCE(SUM(line_value), 0)
        INTO batch_expense
        FROM batch_allocation_lines
        WHERE batch_id = batch.batch_id;

        batch_expense := batch_expense - COALESCE((
            SELECT SUM(return_value)
            FROM stock_returns
            WHERE batch_id = batch.batch_id
        ), 0);

        UPDATE batch_closure_summary
        SET gross_profit = revenue - batch_expense
        WHERE batch_id = batch.batch_id;
    END LOOP;
END $$;
