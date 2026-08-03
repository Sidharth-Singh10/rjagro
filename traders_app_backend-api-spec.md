# Backend API Spec — Trader/Supervisor Live Selling Platform

## Scope Notes (explicitly decided — do not deviate)
- **Requested weight only** at booking time (no requested bird count).
- **No auto-accept / no trader re-accept step.** Supervisor's "close order" action IS the final acceptance. There is no `PENDING_TRADER_ACCEPT` state.
- **Day rate feature removed** (deferred to future — do not implement `indicative_day_rate` or visibility toggle).
- **Overselling is allowed.** No stock/inventory limit enforcement on batches.
- **No credit-limit enforcement.** Credit fields are informational/display-only; nothing blocks order creation.
- **Single supervisor at a time** — no optimistic locking / concurrency handling needed.
- **Audit trail is required** on all order field changes (weight, birds, rate, status).

---

## 1. Entities

**User**
`id, name, role (trader|supervisor|admin), phone, credit_limit (nullable, display-only), credit_terms_days (nullable, display-only), created_at`

**Farm**
`id, code, name, latitude, longitude, distance_km, video_url, maps_url, created_at`

**Batch** (one live-selling cycle for a farm)
`id, farm_id, status (open|live|closed), avg_body_weight, activated_at, closed_at, created_at`

**TimeSlot**
`id, batch_id, slot_time, created_at`

**Order** (a.k.a. Inquiry)
`id, inquiry_number (unique, includes date), trader_id, batch_id, timeslot_id, requested_weight, status, actual_weight (nullable), actual_birds (nullable), entry_rate (nullable), total_amount (nullable, = actual_weight * entry_rate), rejection_reason (nullable), created_at, weight_entered_at, confirmed_at, cancelled_at, rejected_at, expired_at`

**LedgerEntry**
`id, trader_id, order_id (nullable — set for debit entries), type (debit|payment), amount, payment_mode (cash|bank, payment only), screenshot_url (nullable), created_at`

**AuditLog**
`id, order_id, actor_id, action, field_changed (nullable), old_value (nullable), new_value (nullable), created_at`

---

## 2. Order State Machine

```
PENDING
  → WEIGHT_ENTERED        (supervisor enters actual_weight + actual_birds)
  → CANCELLED_BY_TRADER   (trader-initiated; allowed ONLY while status = PENDING)
  → REJECTED_BY_SUPERVISOR (with rejection_reason; allowed from PENDING or WEIGHT_ENTERED)
  → EXPIRED                (system-set when batch.status → closed while order still PENDING)

WEIGHT_ENTERED
  → PENDING                (supervisor deletes/undoes mistaken weight entry)
  → CONFIRMED              (supervisor edits weight/birds if needed, enters entry_rate, closes order
                             → total_amount computed → LedgerEntry(type=debit) auto-created)
  → REJECTED_BY_SUPERVISOR

CONFIRMED, CANCELLED_BY_TRADER, REJECTED_BY_SUPERVISOR, EXPIRED = terminal states
```

Every transition + every field edit (weight, birds, rate) writes an `AuditLog` row (actor, field, old→new value, timestamp).

---

## 3. API Endpoints

### Auth / Users
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/auth/login` | |
| GET | `/users/me` | |
| POST | `/admin/users` | create trader/supervisor |

### Farms & Batches
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/farms` | code, geo, video_url, maps_url |
| GET | `/farms/{id}` | |
| POST | `/batches` | create batch for a farm, status=open |
| GET | `/batches?status=open\|live\|closed` | |
| PATCH | `/batches/{id}/activate` | set avg_body_weight → status=live |
| PATCH | `/batches/{id}/close` | status=closed → triggers auto-expire of any still-PENDING orders on this batch |
| GET | `/batches/{id}` | |
| POST | `/batches/{id}/timeslots` | slot_time |
| GET | `/batches/{id}/timeslots` | |

### Trader — Orders
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/trader/credit-summary` | display-only: credit_limit, ledger-derived overdue/remaining — no enforcement |
| GET | `/trader/batches/live` | batches with status=live |
| GET | `/trader/batches/{id}` | farm + batch detail (no day rate field) |
| POST | `/trader/orders` | `batch_id, timeslot_id, requested_weight` → creates order, status=PENDING, generates `inquiry_number` |
| GET | `/trader/orders?status=` | |
| GET | `/trader/orders/{id}` | |
| POST | `/trader/orders/{id}/cancel` | only if status=PENDING |

### Supervisor — Live Selling
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/supervisor/batches?status=` | |
| GET | `/supervisor/batches/{id}/pending-orders` | Live Farm page: orders with status=PENDING |
| PATCH | `/supervisor/orders/{id}/weight` | body: `actual_weight, actual_birds` → status=WEIGHT_ENTERED; writes AuditLog |
| DELETE | `/supervisor/orders/{id}/weight` | clears actual_weight/actual_birds → status=PENDING; writes AuditLog |
| GET | `/supervisor/orders/confirm-queue` | Order Confirm page: orders with status=WEIGHT_ENTERED (weight/birds pre-filled) |
| PATCH | `/supervisor/orders/{id}/close` | body: `actual_weight (editable), actual_birds (editable), entry_rate` → computes total_amount, status=CONFIRMED, creates LedgerEntry(debit), writes AuditLog |
| POST | `/supervisor/orders/{id}/reject` | body: `reason` → status=REJECTED_BY_SUPERVISOR; writes AuditLog |

### Ledger & Payments
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/ledger/traders/{id}` | full ledger (debits + payments) |
| POST | `/ledger/traders/{id}/payments` | body: `amount, payment_mode(cash\|bank), screenshot_url (optional)` |
| GET | `/ledger/traders/{id}/statement?from&to` | |

### Audit
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/orders/{id}/audit-log` | full change history for an order |

### Media
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/media/upload` | farm video, payment screenshot |

---

## 4. Business Rules Recap
- `inquiry_number` = unique per order, generated at creation, includes date (e.g. `INQ-20260731-0001`).
- `total_amount` is only computed at `close` (`actual_weight × entry_rate`).
- A trader may submit multiple separate orders for the same batch (e.g., at different rates) — each gets its own `inquiry_number`; no merging.
- Batch closing auto-transitions any still-`PENDING` orders on it to `EXPIRED`.
- Ledger debit entries are created only on `CONFIRMED`; nothing else writes to the ledger except manual payments.
