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


def process(store,job):
    try:
        predictions,metadata=build(job['snapshot'],job['origin_date'])
        store.publish(job,predictions,metadata)
        log.info('batch processed id=%s kind=%s',job['id'],job['kind'])
    except Exception:
        log.exception('batch failed id=%s',job['id'])
        store.fail(job,'Forecast generation failed; inspect worker logs')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--describe',action='store_true',help='Print frozen protocol; no database access')
    args=parser.parse_args()
    logging.basicConfig(level=logging.INFO,format='%(asctime)s %(levelname)s %(name)s %(message)s')
    protocol_id,config=definition()
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
                    future=executor.submit(process,store,job) if job else None
            except Exception:
                log.exception('scheduler/evaluator tick failed; retrying without fabricating a batch')
            time.sleep(15)


if __name__=='__main__':
    main()
