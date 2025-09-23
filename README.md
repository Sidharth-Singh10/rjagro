# Project Setup

## Backend Setup

1. **Install Rust**  
   Follow the instructions at [https://www.rust-lang.org/tools/install](https://www.rust-lang.org/tools/install).

2. **Install Shuttle**  
   `cargo install shuttle`

3. **Setup Database**
   `psql 'connection_url' -f backup.sql`

5. **Backend Server**
   - create `Secrets.toml` in root, add `DATABASE_URL` and `JWT_SECRET`
   - run `shuttle run`

6. **Frontend Server**
   - `cd rjagro_frontend`
   - `npm i`
   - `npm run dev`
