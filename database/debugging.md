# Debugging Playbooks

> Only persist a debugging rule when there is evidence (code, data or a
> reproduced failure). Each entry should say what to check and why.

## General workflow

1. `./db-knowledge search <symptom>` to find the relevant tables.
2. `./db-knowledge table <name>` and `./db-knowledge relationships <name>`.
3. Check `database/invariants.md` for rules that should hold.
4. Verify structural facts against the live database (the snapshot can lag).
5. Query real data, then record new findings here with evidence.

## Known failure modes

### Payments and receivables card shows ₹0 in the Overview

**Cause (fixed):** the frontend compared `payment_type` against uppercase DB
values (`'RECEIVABLE'`) while the API serializes Rust enums as variant names
(`"Receivable"`), so every row was filtered out.

**Evidence:** `rjagro_frontend/app/components/v2/overview_module.tsx`
(`isPaymentType`), `entity/src/sea_orm_active_enums.rs`.

**Check:** `SELECT payment_type, COUNT(*) FROM batch_sales GROUP BY 1;` then
inspect the API response casing.

### Negative `amount_due` for a trader

**Cause:** overpayment. `amount_due` can legitimately go negative when payments
exceed receivable sales; the traders list colors negative balances green.

**Evidence:** `src/handlers/fetch_all.rs` (`get_traders_handler`).

**Check:** compare per-trader sums of `batch_sales.value` and
`trader_payments.amount`; look for rounded-up final payments.

## Adding a debugging note

Record: symptom → what to check (ordered) → evidence → date verified.
