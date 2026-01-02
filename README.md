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
   - remove `Bearer` prefix from `/utils/api.ts` from line 24
