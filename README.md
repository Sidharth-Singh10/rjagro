# Project Setup

## Backend Setup

1. **Install Rust**  
   Follow the instructions at [https://www.rust-lang.org/tools/install](https://www.rust-lang.org/tools/install).

2. **Setup Database**
   `psql 'connection_url' -f backup.sql`

3. **Backend Server**
   - create `.env` in root, add `DATABASE_URL` and `JWT_SECRET`
   - run `cargo run`

6. **Frontend Server**
   - `cd rjagro_frontend`
   - `npm i`
   - `npm run dev`
   - set .env
   - `app/utils/api.ts` already sends the `Bearer ` prefix, which the backend expects

## Stored Metrics History

Financial and operational trend metrics are snapshotted into `metric_snapshots`
(apply `metrics_schema_additions.sql` on existing databases).

- **Monthly**: revenue (sales & closed-batch), COGS, gross/net profit, other
  expenses, commission, interest, margins, ₹/kg, cash flow, balances (cash,
  inventory, receivables, payables, working capital, loans), birds placed/sold,
  mortality, feed consumed, FCR.
- **Daily**: revenue, kg sold, revenue/kg, cash in/out and net cash flow.
  Idle days are skipped so trend lines only show real activity.

Endpoints:

- `GET /getall/metric_snapshots?period_type=month&from=2026-01&to=2026-09&metrics=revenue,net_profit`
- `POST /insert/metrics/refresh` (Admin) with optional
  `{ "period_type": "day", "from": "2026-09-01", "to": "2026-09-13" }`

On startup the backend backfills the full history, then refreshes the open
periods (today, yesterday, current month) every hour. The Overview dashboard
reads these snapshots for its P&L, margin, ₹/kg, cash-flow, working-capital and
operations charts.
