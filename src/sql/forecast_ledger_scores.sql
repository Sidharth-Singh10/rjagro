WITH filtered AS (
    SELECT * FROM forecast_score_rows
    WHERE protocol_id = $1 AND ($2 = 'all' OR kind = $2)
      AND ($3 = 'all' OR ($3 = 'event' AND event_active)
          OR ($3 = 'non_event' AND NOT event_active) OR ($3 = 'advance_event' AND advance_event))
      AND ($4::date IS NULL OR target_date >= $4::date)
      AND ($5::date IS NULL OR target_date <= $5::date)
      AND ($6::text IS NULL OR EXISTS (
          SELECT FROM jsonb_array_elements(events) ev WHERE ev->>'id'=$6
            AND ($3 <> 'advance_event' OR published_at < ((ev->>'leadStart')::date::timestamp AT TIME ZONE 'Asia/Kolkata'))
      ))
), event_counts AS (
    SELECT model, bucket,
        count(DISTINCT (ev->>'id',ev->>'start')) AS occurrences,
        count(DISTINCT extract(year FROM (ev->>'start')::date)) AS years
    FROM filtered CROSS JOIN LATERAL jsonb_array_elements(events) ev
    WHERE ($6::text IS NULL OR ev->>'id'=$6)
      AND ($3 <> 'advance_event' OR published_at < ((ev->>'leadStart')::date::timestamp AT TIME ZONE 'Asia/Kolkata'))
    GROUP BY model,bucket
), per_origin AS (
    SELECT model, bucket, origin_date, avg(absolute_error) AS mae
    FROM filtered GROUP BY model, bucket, origin_date
), balanced AS (
    SELECT model, bucket, avg(mae) AS origin_mae FROM per_origin GROUP BY model, bucket
), scores AS (
    SELECT f.model, f.bucket, count(*) AS n, count(DISTINCT f.origin_date) AS origins,
        count(DISTINCT f.target_date) AS unique_dates, avg(f.absolute_error) AS mae,
        sqrt(avg(f.squared_error)) AS rmse, avg(f.error) AS bias, avg(f.smape) AS smape,
        count(f.covered80) AS interval_n80, avg(f.covered80::int) AS coverage80,
        count(f.covered95) AS interval_n95, avg(f.covered95::int) AS coverage95,
        avg(f.width80) AS width80, avg(f.width95) AS width95,
        avg(f.interval_score80) AS interval_score80, avg(f.interval_score95) AS interval_score95,
        max(f.evaluated_at) AS evaluated_at
    FROM filtered f GROUP BY f.model, f.bucket
)
SELECT coalesce(jsonb_agg(jsonb_build_object(
    'model',s.model,'bucket',s.bucket,'n',s.n,'origins',s.origins,'uniqueDates',s.unique_dates,
    'mae',s.mae,'originMae',b.origin_mae,'rmse',s.rmse,'bias',s.bias,'smape',s.smape,
    'eventOccurrences',coalesce(ec.occurrences,0),'eventYears',coalesce(ec.years,0),
    'intervalN80',s.interval_n80,'coverage80',s.coverage80,'intervalN95',s.interval_n95,'coverage95',s.coverage95,
    'width80',s.width80,'width95',s.width95,'intervalScore80',s.interval_score80,
    'intervalScore95',s.interval_score95,'evaluatedAt',s.evaluated_at
) ORDER BY s.model, CASE s.bucket WHEN '1-7' THEN 1 WHEN '8-30' THEN 2 WHEN '31-90' THEN 3
    WHEN '91-180' THEN 4 WHEN '181-365' THEN 5 ELSE 6 END),'[]'::jsonb) AS data
FROM scores s JOIN balanced b USING (model,bucket) LEFT JOIN event_counts ec USING (model,bucket)
