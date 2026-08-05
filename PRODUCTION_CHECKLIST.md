# Production Deployment Checklist

> All three repos (`rjagro`, `rjagro_traders`, `rjagro_supervisor`) have been audited for production readiness.
> Last updated: 2026-08-04

---

## 1. Critical fixes applied during this audit

- **JWT signing bug** (`src/auth/login.rs:64`): `/login` was signing tokens with the literal string `"JWT_SECRET"` instead of the env var. **Fixed** — now reads `JWT_SECRET` from the environment. Verified: `cargo check` clean.

- **Deployable SQL** (`trader_schema_additions.sql`): a new idempotent SQL file for the per-trader ledger (`trader_ledger_entries` table + `ledger_entry_type`/`payment_mode` enums + `users.phone` column). Apply after `rjagro_schema_backup.sql` on a fresh database.

- **`.env.example`** added to both `rjagro_traders` and `rjagro_supervisor` documenting the required `VITE_API_BASE_URL` variable.

---

## 2. Backend (`rjagro`) — production snapshot

| Check | Status |
|---|---|
| `cargo check` / `cargo build` | ✅ clean, zero warnings |
| JWT signing (login) | ✅ uses env var |
| JWT signing (trader_login) | ✅ uses env var |
| JWT verify | ✅ uses env var |
| CORS origins | ✅ `tauri.localhost` (Tauri), `localhost:1420` (dev), `rjagro.vercel.app` |
| CORS methods | ✅ GET, POST, PUT, **PATCH**, DELETE, OPTIONS |
| Database connection | ✅ `DATABASE_URL` env var |
| Secrets in code | ✅ none — all from env |
| Hardcoded URLs | ✅ none |
| Dockerfile | ✅ copies binary + assets; exposes 0.0.0.0:8000 |
| SQL schema for deployment | ✅ `backup.sql` + `rjagro_schema_backup.sql` + new `trader_schema_additions.sql` |
| Auth middleware | ✅ JWT required for all routes except `/login`, `/trader/login`, `/trader/register` |
| Role enforcement | ✅ Admin/Supervisor/Trader/Accountant gates per endpoint |

**Key env vars** (set in Docker or host):
```
DATABASE_URL=postgresql://...
JWT_SECRET=<random-64-char-string>
```

---

## 3. Trader app (`rjagro_traders`) — production snapshot

| Check | Status |
|---|---|
| `npm run build` (tsc + vite) | ✅ clean |
| API base URL | ✅ `VITE_API_BASE_URL` env var (defaults to `localhost:8000`) |
| `.env.local` | ✅ gitignored (`*.local`) |
| `.env.example` | ✅ documents `VITE_API_BASE_URL` |
| Auth session | ✅ localStorage `rjagro_auth_user`; token expiry checked at mount |
| 401 handling | ✅ clears session + redirects to `/login` |
| Hardcoded URLs | ✅ none |
| Mock data | ✅ removed (`mockData.ts` deleted) |
| All pages wired to API | ✅ yes (Dashboard, BookOrder, FarmDetails, Orders, OrderDetail, OrderHistory, Ledger, Profile) |

**To configure production URL** — place these in the build environment or `.env.local`:
```
VITE_API_BASE_URL=https://your-backend.com
```
For Tauri builds (native app), `tauri.localhost` origin is already in backend CORS — no Tauri config changes needed.

---

## 4. Supervisor app (`rjagro_supervisor`) — production snapshot

| Check | Status |
|---|---|
| `npm run build` (tsc + vite) | ✅ clean |
| API base URL | ✅ `VITE_API_BASE_URL` env var (defaults to `localhost:8000`) |
| `.env.example` | ✅ documents `VITE_API_BASE_URL` |
| Auth session | ✅ localStorage `rjagro_supervisor_user`; token expiry checked at mount |
| 401 handling | ✅ clears session + redirects to `/login` |
| Hardcoded URLs | ✅ none |
| All pages wired to API | ✅ yes (Login, Batches, BatchDetail, ConfirmQueue) |
| Git repository | ✅ initialized (`git init -b main`), initial commit made |

**Same `.env.local` setup as the trader app.**

---

## 5. Deployment order (recommended)

1. **Database**: apply `backup.sql` → `rjagro_schema_backup.sql` → `trader_schema_additions.sql`.
2. **Backend**: build Docker image or `cargo build --release`; set `DATABASE_URL` + `JWT_SECRET`.
3. **Frontends**: build each with `VITE_API_BASE_URL` pointing to the backend; serve static `dist/` or build Tauri native apps.
4. **Verify**: login as trader (`/trader/login`) and supervisor (`/login`); exercise the full order lifecycle.

---

## 6. Known limitations (non-blocking)

| Limitation | Impact |
|---|---|
| No health check endpoint (`/healthz`) | Not critical; add if using orchestrator probes |
| No pagination on Orders/History lists | Fine for small data volumes (< 1k orders) |
| Tauri apps both use port 1420 in dev | Cannot run both dev servers simultaneously; not a production issue |
| `rjagro_schema_backup.sql` may drift from live DB | Direct SQL was used for new tables — the dump file should be regenerated before fresh deployment |
| Media upload (`POST /media/upload`) was deferred | Farm video / payment screenshot URLs must be set externally for now |
| Docker runtime image is stateless | Media (when implemented) needs a volume; `uploads/` dir is ephemeral otherwise |
| Supervisor section "Contact Supervisor" uses email/mailto when no phone is set | Supervisors should have phones populated in `users.phone` for WhatsApp contact |
