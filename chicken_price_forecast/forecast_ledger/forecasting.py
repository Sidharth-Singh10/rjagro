"""Fit frozen methods on the batch snapshot; never use filesystem quote data."""
from datetime import timedelta
import math
import numpy as np
import pandas as pd

from cp_pipeline import Config, MemorySource, run
from cp_pipeline.calendar import load
from cp_pipeline.config import DEFAULT_EVENTS
from reassessment.models import predict_all
from reassessment.core import empirical_band
from forecast_ledger.core import MODELS,horizon_bucket


def series_from_snapshot(snapshot,origin):
    rows=snapshot['prices']
    dates=pd.DatetimeIndex([r['date'] for r in rows])
    values=np.array([r['price'] for r in rows],float)
    if not len(rows) or dates.has_duplicates or not dates.is_monotonic_increasing or not np.isfinite(values).all() or (values<=0).any():
        raise ValueError('Invalid input snapshot')
    if dates[-1].date()!=origin or len(pd.date_range(dates[0],dates[-1]))!=len(dates):
        raise ValueError('Missing origin quote or internal daily gaps; no interpolation allowed')
    if len(rows)<366:
        raise ValueError('At least one full year of training is required')
    return pd.Series(values,index=dates)


def calibration_errors(s,cal):
    months=pd.date_range(s.index[0]+pd.Timedelta(days=365),s.index[-1],freq='MS')
    origins=sorted(set(months.tolist()+[m+pd.Timedelta(days=14) for m in months]))
    origins=[o for o in origins if o<s.index[-1] and len(s.loc[:o])>=365][-12:]
    rows=[]
    for origin in origins:
        future=pd.date_range(origin+pd.Timedelta(days=1),min(origin+pd.Timedelta(days=180),s.index[-1]))
        fitted=predict_all(s.loc[:origin],future,cal,keys=('naive','ar1','hgb','ensemble'))
        if fitted.failures:
            raise RuntimeError(fitted.failures)
        for model,pred in fitted.predictions.items():
            for d,p in zip(future,pred):
                rows.append(dict(model=model,origin=origin,date=d,h=(d-origin).days,error=p-np.log(s[d])))
    return pd.DataFrame(rows)


def bands(errors,model,h):
    options=[]
    if errors.empty:
        return None
    for b in ('1-7','8-30','31-90','91-180'):
        d=errors[(errors.model==model)&(errors.h.map(horizon_bucket)==b)]
        d=d.sort_values(['date','origin']).drop_duplicates('date',keep='last')
        if len(d)<30 or d.origin.nunique()<4:
            continue
        q80,q95=empirical_band(d.error,.2),empirical_band(d.error,.05)
        if q80 and q95:
            options.append((b,int(d.h.max()),q80[1],q95[1]))
    same=[r for r in options if r[0]==horizon_bucket(h) and h<=r[1]]
    if same:
        _,support,q80,q95=same[0]
        return q80,q95,'empirical_dependent_calibration'
    eligible=[r for r in options if r[1]<=h]
    if not eligible:
        return None
    _,support,q80,q95=max(eligible,key=lambda r:r[1])
    factor=math.sqrt(max(1,h/support))
    return q80*factor,q95*factor,'unvalidated_sqrt_h_scenario'


def build(snapshot,origin,calendar_path=DEFAULT_EVENTS):
    s=series_from_snapshot(snapshot,origin)
    cal=load(calendar_path)
    future=pd.date_range(s.index[-1]+pd.Timedelta(days=1),'2027-12-31')
    if not len(future):
        raise ValueError('Frozen protocol has reached its 2027-12-31 endpoint')
    # Native incumbent remains unchanged, including its 2,000-draw final study.
    incumbent=run(MemorySource(s),Config(),events_path=calendar_path)['artifacts']['forecast_daily'].set_index('date')
    fit=predict_all(s,future,cal,keys=('naive','ar1','hgb','ensemble'))
    if fit.failures:
        raise RuntimeError(fit.failures)
    errors=calibration_errors(s,cal)
    windows={}
    for r in cal.discrete.itertuples():
        event=dict(id=r.definition_id,name=r.name,start=str(r.start_date.date()),end=str(r.end_date.date()),
                   leadStart=str((r.start_date-pd.Timedelta(days=7)).date()))
        for d in pd.date_range(r.start_date,r.end_date):
            windows.setdefault(d,[]).append(event)
    predictions=[]
    maxima={k:[0.,0.] for k in MODELS}
    for i,d in enumerate(future):
        h=i+1
        for model in MODELS:
            if model=='existing':
                old=incumbent.loc[d]
                point=float(old.forecast)
                bounds={k:float(old[k]) for k in ('lo80','hi80','lo95','hi95')}
                state='native_unverified_long_horizon' if h>90 else 'native_original_method'
            else:
                component=('hgb' if h<=7 else 'naive' if h<=30 else 'ensemble') if model=='hybrid' else model
                point=float(np.exp(fit.predictions[component][i]))
                q=bands(errors,component,h)
                bounds={k:None for k in ('lo80','hi80','lo95','hi95')}
                state='insufficient_calibration'
                if q:
                    q80,q95,state=q
                    maxima[model]=[max(maxima[model][0],q80),max(maxima[model][1],q95)]
                    bounds=dict(lo80=point*np.exp(-maxima[model][0]),hi80=point*np.exp(maxima[model][0]),
                                lo95=point*np.exp(-maxima[model][1]),hi95=point*np.exp(maxima[model][1]))
            predictions.append(dict(model=model,target_date=str(d.date()),horizon=h,prediction=point,
                                    interval_status=state,events=windows.get(d,[]),**bounds))
    return predictions,dict(trainingObservations=len(s),lastQuote=str(s.index[-1].date()),
                            models=fit.metadata,calibrationPairs=len(errors),
                            caveat='Daily price bands, not event-mean intervals; long horizons are scenarios')
