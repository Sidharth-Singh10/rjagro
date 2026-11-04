"""Pure timing, scoring and paired comparison semantics."""
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
from collections import defaultdict
import math

IST=ZoneInfo('Asia/Kolkata')
MODELS=('existing','hybrid','ar1','naive')
LABELS={'existing':'Existing event anchor','hybrid':'Frozen hybrid','ar1':'AR(1)','naive':'Last-price benchmark'}


def schedule(now):
    local=now.astimezone(IST)
    at=datetime.combine(local.date(),time(0,5),tzinfo=IST)
    state='waiting' if local<at else 'due' if local<at+timedelta(minutes=2) else 'missed'
    return dict(origin=local.date()-timedelta(days=1),scheduled=at,state=state)


def horizon_bucket(h):
    if h<=0:
        raise ValueError('Horizon must be positive')
    return next(label for upper,label in [(7,'1-7'),(30,'8-30'),(90,'31-90'),(180,'91-180'),(365,'181-365'),(math.inf,'>365')] if h<=upper)


def evaluate(prediction,actual,first_available,published):
    empty=dict(status='unavailable',actual=actual,actual_available_at=first_available,
               error=None,absolute_error=None,squared_error=None,smape=None,
               covered80=None,covered95=None,width80=None,width95=None,
               interval_score80=None,interval_score95=None)
    if actual is None:
        return empty
    if first_available is None or first_available<=published:
        return dict(empty,status='known_before_publication')
    p=float(prediction['prediction'])
    a=float(actual)
    if not math.isfinite(a) or a<=0:
        raise ValueError('Invalid actual price')
    err=p-a
    out=dict(empty,status='scored',error=err,absolute_error=abs(err),squared_error=err*err,
             smape=200*abs(err)/(abs(p)+abs(a)))
    for level in (80,95):
        lo,hi=prediction.get(f'lo{level}'),prediction.get(f'hi{level}')
        if lo is not None and hi is not None:
            lo,hi=float(lo),float(hi)
            alpha=1-level/100
            out.update({f'covered{level}':lo<=a<=hi,f'width{level}':hi-lo,
                        f'interval_score{level}':hi-lo+2/alpha*max(lo-a,0)+2/alpha*max(a-hi,0)})
    return out


def summarize(rows):
    """Reference semantics: only complete, scored, same-issuance four-model pairs."""
    pairs=defaultdict(list)
    for r in rows:
        pairs[(r['batch_id'],r['target_date'])].append(r)
    groups=defaultdict(list)
    for records in pairs.values():
        if len(records)!=4 or {r['model'] for r in records}!=set(MODELS) or any(r['status']!='scored' for r in records):
            continue
        for r in records:
            groups[(r['model'],horizon_bucket(r['horizon']))].append(r)
    output=[]
    for (model,bucket),g in sorted(groups.items()):
        out=dict(model=model,bucket=bucket,n=len(g),origins=len({r['origin_date'] for r in g}),
                 uniqueDates=len({r['target_date'] for r in g}),
                 mae=sum(r['absolute_error'] for r in g)/len(g),
                 rmse=math.sqrt(sum(r['squared_error'] for r in g)/len(g)),
                 bias=sum(r['error'] for r in g)/len(g),smape=sum(r['smape'] for r in g)/len(g))
        for level in (80,95):
            v=[r for r in g if r[f'covered{level}'] is not None]
            out[f'intervalN{level}']=len(v)
            out[f'coverage{level}']=sum(r[f'covered{level}'] for r in v)/len(v) if v else None
        output.append(out)
    return output
