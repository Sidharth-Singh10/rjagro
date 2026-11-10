"""Application database adapter. Agent investigations use PostgreSQL MCP only."""
import hashlib
import json
from datetime import date,timedelta

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from forecast_ledger.core import (IST,evaluate,MODELS,official_window,pending_origins)
from forecast_ledger.forecasting import series_from_snapshot


class Store:
    def __init__(self,dsn,protocol_id):
        self.dsn=dsn
        self.protocol_id=protocol_id

    def connect(self):
        return psycopg.connect(self.dsn,autocommit=True,row_factory=dict_row,connect_timeout=10)

    def register(self,definition):
        with self.connect() as conn,conn.transaction():
            conn.execute('''INSERT INTO forecast_protocols (id,definition,initial_known_dates)
                SELECT %s,%s,coalesce(jsonb_agg(price_date ORDER BY price_date),'[]'::jsonb)
                FROM chicken_prices ON CONFLICT DO NOTHING''',(self.protocol_id,Jsonb(definition)))
            row=conn.execute('SELECT definition FROM forecast_protocols WHERE id=%s',(self.protocol_id,)).fetchone()
            if row['definition']!=definition:
                raise ValueError('Pinned protocol differs from stored definition')

    def capture(self,kind):
        with self.connect() as conn,conn.transaction():
            conn.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
            now=conn.execute('SELECT transaction_timestamp() AS now').fetchone()['now']
            if kind=='official':
                self._capture_official(conn,now)
            else:
                self._capture_ad_hoc(conn,now)

    def _capture_official(self,conn,now):
        """One official batch per recorded market day, issued as that day arrives."""
        floor=self._origins_from(conn)
        if floor is None:
            return
        priced=[r['price_date'] for r in conn.execute(
            'SELECT price_date FROM chicken_prices WHERE price_date>=%s ORDER BY price_date',(floor,))]
        if not priced:
            return
        batched={r['origin_date'] for r in conn.execute(
            "SELECT origin_date FROM forecast_batches WHERE protocol_id=%s AND kind='official'",
            (self.protocol_id,))}
        for origin in pending_origins(priced,batched,floor):
            rows=self._prices(conn,origin)
            if not rows or rows[-1]['price_date']!=origin:
                continue
            snapshot=self._snapshot(rows)
            state,error='queued',None
            try:
                series_from_snapshot(snapshot,origin)
            except ValueError as exc:
                state,error='blocked',str(exc)
            start,end=official_window(origin)
            self._insert(conn,now,origin,'official',state,error,snapshot,scheduled_for=start,
                         metadata={'backfill':True} if now>=end else {})

    def _origins_from(self,conn):
        row=conn.execute("SELECT definition->>'originsFrom' AS d FROM forecast_protocols WHERE id=%s",
                         (self.protocol_id,)).fetchone()
        if not row or not row['d']:
            return None
        return date.fromisoformat(row['d'])

    def _capture_ad_hoc(self,conn,now):
        latest=conn.execute('SELECT max(price_date) AS d FROM chicken_prices WHERE price_date<=%s',
                            (now.astimezone(IST).date(),)).fetchone()['d']
        if latest is None:
            return
        snapshot=self._snapshot(self._prices(conn,latest))
        digest=self._digest(snapshot)
        # An official batch holding these same inputs already records this change.
        if conn.execute('''SELECT 1 AS hit FROM forecast_batches
                WHERE protocol_id=%s AND origin_date=%s AND dataset_hash=%s''',
                (self.protocol_id,latest,digest)).fetchone():
            return
        state,error='queued',None
        try:
            series_from_snapshot(snapshot,latest)
        except ValueError as exc:
            state,error='blocked',str(exc)
        self._insert(conn,now,latest,'ad_hoc',state,error,snapshot,key_suffix=f':{digest}')

    def _prices(self,conn,upto):
        return conn.execute('''SELECT price_date,price,updated_at FROM chicken_prices
            WHERE price_date<=%s ORDER BY price_date''',(upto,)).fetchall()

    def _snapshot(self,rows):
        return dict(prices=[dict(date=str(r['price_date']),price=float(r['price']),
                                 recordedAt=r['updated_at'].isoformat()) for r in rows],
                    source='rjagro.public.chicken_prices',
                    availability='recorded snapshot, not original historical vintages')

    def _digest(self,snapshot):
        return hashlib.sha256(json.dumps(snapshot,sort_keys=True).encode()).hexdigest()

    def _insert(self,conn,now,origin,kind,state,error,snapshot,scheduled_for=None,key_suffix='',metadata=None):
        watermark=conn.execute('SELECT coalesce(max(id),0) AS id FROM chicken_price_audit').fetchone()['id']
        conn.execute('''INSERT INTO forecast_batches
            (protocol_id,intent_key,kind,origin_date,scheduled_for,snapshot_at,snapshot,dataset_hash,
             source_watermark,status,error,metadata)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING''',
            (self.protocol_id,f'{kind}:{self.protocol_id}:{origin}{key_suffix}',kind,origin,
             scheduled_for,now,Jsonb(snapshot),self._digest(snapshot),watermark,state,error,
             Jsonb(metadata or {})))

    def claim(self):
        with self.connect() as conn,conn.transaction():
            conn.execute('''UPDATE forecast_batches SET status='failed',error='Worker lease expired'
                WHERE protocol_id=%s AND status='running' AND started_at<now()-interval '30 minutes' ''',(self.protocol_id,))
            return conn.execute('''WITH job AS (
                SELECT id FROM forecast_batches WHERE protocol_id=%s
                  AND status IN ('queued','failed') AND attempts<3
                ORDER BY (kind='official') DESC,requested_at FOR UPDATE SKIP LOCKED LIMIT 1
            ) UPDATE forecast_batches b SET status='running',started_at=clock_timestamp(),attempts=attempts+1,error=NULL
              FROM job WHERE b.id=job.id RETURNING b.*''',(self.protocol_id,)).fetchone()

    def fail(self,job,error):
        with self.connect() as conn:
            conn.execute('''UPDATE forecast_batches SET status='failed',error=%s
                WHERE id=%s AND status='running' AND started_at=%s''',(error,job['id'],job['started_at']))

    def publish(self,job,rows,metadata):
        expected={(r['target_date'],m) for r in rows for m in MODELS}
        if len(rows)!=len(expected) or {(r['target_date'],r['model']) for r in rows}!=expected:
            raise ValueError('Incomplete or duplicate four-model cohort')
        with self.connect() as conn,conn.transaction():
            current=conn.execute('SELECT * FROM forecast_batches WHERE id=%s FOR UPDATE',(job['id'],)).fetchone()
            if current['status']!='running' or current['started_at']!=job['started_at']:
                raise ValueError('Stale worker cannot publish a reclaimed batch')
            now=conn.execute('SELECT clock_timestamp() AS now').fetchone()['now']
            if now>current['started_at']+timedelta(minutes=15):
                conn.execute("UPDATE forecast_batches SET status='failed',attempts=3,error='Fit did not finish inside the deadline; no late forecast' WHERE id=%s",(job['id'],))
                return
            with conn.cursor() as cur:
                cur.executemany('''INSERT INTO forecast_predictions
                    (batch_id,model,target_date,horizon,prediction,lo80,hi80,lo95,hi95,interval_status,events)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)''',
                    [(job['id'],r['model'],r['target_date'],r['horizon'],r['prediction'],r['lo80'],r['hi80'],
                      r['lo95'],r['hi95'],r['interval_status'],Jsonb(r['events'])) for r in rows])
            conn.execute('''UPDATE forecast_batches SET status='published',published_at=clock_timestamp(),metadata=%s
                WHERE id=%s''',(Jsonb(metadata),job['id']))

    def reconcile(self):
        """Latest truth revisions append scores; never rewrite issued forecasts."""
        with self.connect() as conn,conn.transaction():
            conn.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
            # Serialize evaluators without waiting on a stale MVCC snapshot.
            # A competing tick returns and retries with fresh truth next time.
            locked=conn.execute("SELECT pg_try_advisory_xact_lock(hashtextextended('forecast-ledger-evaluation',0)) AS acquired").fetchone()
            if not locked['acquired']:
                return 0
            rows=conn.execute('''WITH audit AS (
                SELECT price_date,max(id) AS revision,
                    min(changed_at) FILTER (WHERE new_price IS NOT NULL) AS first_seen
                FROM chicken_price_audit GROUP BY price_date
            ), candidates AS (
                SELECT p.*,b.published_at,cp.price AS actual,
                    least(cp.updated_at,a.first_seen,
                        CASE WHEN fp.initial_known_dates ? p.target_date::text THEN fp.created_at END) AS first_seen,
                    coalesce(cp.updated_at::text,'deleted')||':'||coalesce(a.revision::text,'0') AS revision
                FROM forecast_predictions p JOIN forecast_batches b ON b.id=p.batch_id
                JOIN forecast_protocols fp ON fp.id=b.protocol_id
                LEFT JOIN chicken_prices cp ON cp.price_date=p.target_date
                LEFT JOIN audit a ON a.price_date=p.target_date
                WHERE b.status='published' AND p.target_date<=(now() AT TIME ZONE 'Asia/Kolkata')::date
                  AND (cp.price IS NOT NULL OR a.revision IS NOT NULL)
            ) SELECT c.* FROM candidates c WHERE NOT EXISTS (
                SELECT FROM forecast_evaluations e WHERE e.batch_id=c.batch_id AND e.model=c.model
                  AND e.target_date=c.target_date AND e.actual_revision=c.revision)
              ORDER BY c.batch_id,c.target_date,c.model LIMIT 5000''').fetchall()
            columns=('status','actual','actual_available_at','error','absolute_error','squared_error','smape',
                     'covered80','covered95','width80','width95','interval_score80','interval_score95')
            values=[]
            for r in rows:
                result=evaluate(r,float(r['actual']) if r['actual'] is not None else None,r['first_seen'],r['published_at'])
                values.append((r['batch_id'],r['model'],r['target_date'],r['revision'],*(result[k] for k in columns)))
            if values:
                with conn.cursor() as cur:
                    cur.executemany('''INSERT INTO forecast_evaluations
                        (batch_id,model,target_date,actual_revision,status,actual,actual_available_at,error,
                         absolute_error,squared_error,smape,covered80,covered95,width80,width95,interval_score80,interval_score95)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        ON CONFLICT DO NOTHING''',values)
            return len(values)
