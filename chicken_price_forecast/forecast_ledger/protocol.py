"""Content-address the methods, calendar and runtime; coefficients may refit."""
import hashlib
import importlib.metadata
import json
import platform
from pathlib import Path

from cp_pipeline.config import DEFAULT_EVENTS
from cp_pipeline.calendar import load
from forecast_ledger.core import LABELS

ROOT=Path(__file__).resolve().parents[1]


def definition():
    events=load(DEFAULT_EVENTS).discrete[['definition_id','name']].drop_duplicates()
    paths=[p for folder in ('cp_pipeline','forecast_ledger') for p in (ROOT/folder).glob('*.py')
           if not p.name.startswith('test_')]
    paths += [ROOT/'reassessment/models.py',ROOT/'reassessment/core.py',DEFAULT_EVENTS]
    files={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}
    d=dict(name='Four-model prospective trial v1',timezone='Asia/Kolkata',issuance='00:05',
           closesPreviousDay=True,officialCaptureGraceSeconds=120,officialPublicationDeadlineSeconds=900,forecastEnd='2027-12-31',
           models=[dict(id=k,name=v,version='v1',role='production' if k=='existing' else 'challenger') for k,v in LABELS.items()],
           hybrid={'1-7':'hgb','8-30':'naive','31+':'ensemble'},
           calibration=dict(method='absolute log-error quantiles, unique target dates, min 4 origins/30 dates',
                            origins='last 12 semimonthly origins with >=365 training observations',maxHorizon=180,
                            future='sqrt horizon scenario beyond support; cumulative maximum log widths'),
           scoring=dict(primary='official complete four-model cohorts',actuals='latest recorded revision, prior scores retained',
                        availability='publication strictly before first recorded actual',eventLeadDays=7),
           events=[dict(id=r.definition_id,name=r.name) for r in events.itertuples()],
           python=platform.python_version(),
           # Only packages that change fitted numbers; the database driver does not.
           packages={k:importlib.metadata.version(k) for k in ('numpy','pandas','scipy','statsmodels','scikit-learn','joblib','threadpoolctl')},
           sourceFiles=files)
    fingerprint=hashlib.sha256(json.dumps(d,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    return fingerprint,d
