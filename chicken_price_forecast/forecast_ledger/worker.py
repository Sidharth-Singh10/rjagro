"""Dedicated sidecar; scheduler/evaluator stay responsive while models fit."""
import argparse
import json
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor

from forecast_ledger.protocol import definition
from forecast_ledger.store import Store
from forecast_ledger.forecasting import build

log=logging.getLogger('forecast-ledger')


def process(store,job,event_challenger=False):
    try:
        predictions,metadata=build(job['snapshot'],job['origin_date'])
        if event_challenger:
            metadata['eventChallenger']=_challenger(job)
        store.publish(job,predictions,metadata)
        log.info('batch processed id=%s kind=%s',job['id'],job['kind'])
    except Exception:
        log.exception('batch failed id=%s',job['id'])
        store.fail(job,'Forecast generation failed; inspect worker logs')


def _challenger(job):
    """Strictly additive. Any failure here must never block the published cohort."""
    try:
        import pandas as pd
        from event_forecast.service import safe_build
        rows=job['snapshot']['prices']
        prices=pd.Series([r['price'] for r in rows],
                         index=pd.to_datetime([r['date'] for r in rows]))
        return safe_build(prices)
    except Exception:
        log.exception('event challenger archive failed id=%s; incumbent cohort unaffected',job['id'])
        return {'status':'unavailable','model':'event_ar_v1',
                'error':'Archive step failed before the candidate could run',
                'incumbentUnchanged':True}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--describe',action='store_true',help='Print frozen protocol; no database access')
    parser.add_argument('--event-challenger',action='store_true',
                        help='Archive the event AR-error challenger in new batch metadata; never promote')
    args=parser.parse_args()
    logging.basicConfig(level=logging.INFO,format='%(asctime)s %(levelname)s %(name)s %(message)s')
    protocol_id,config=definition(event_challenger=args.event_challenger)
    if args.describe:
        print(json.dumps(dict(id=protocol_id,definition=config),indent=2))
        return
    if os.environ.get('FORECAST_PROTOCOL_ID')!=protocol_id:
        raise SystemExit(f'Pin FORECAST_PROTOCOL_ID={protocol_id} after reviewing --describe; refusing silent method change')
    store=Store(os.environ['DATABASE_URL'],protocol_id)
    store.register(config)
    with ThreadPoolExecutor(max_workers=1) as executor:
        future=None
        while True:
            try:
                store.capture('official')
                store.capture('ad_hoc')
                scored=store.reconcile()
                if scored:
                    log.info('evaluation revisions appended=%s',scored)
                if future is None or future.done():
                    if future is not None:
                        future.result()
                    job=store.claim()
                    future=executor.submit(process,store,job,args.event_challenger) if job else None
            except Exception:
                log.exception('scheduler/evaluator tick failed; retrying without fabricating a batch')
            time.sleep(15)


if __name__=='__main__':
    main()
