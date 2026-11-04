//! Read-only permanent forecast ledger. Existing Analytics contracts stay intact.
use axum::{extract::{Path, Query, State}, http::{header, StatusCode}, Json};
use chrono::{NaiveDate, Utc};
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, Statement};
use serde::Deserialize;
use serde_json::{json, Value};
use tracing::error;
use uuid::Uuid;

type ApiError = (StatusCode, Json<Value>);

fn bad(message: &str) -> ApiError {
    (StatusCode::BAD_REQUEST, Json(json!({"error":{"code":"INVALID_LEDGER_QUERY","message":message}})))
}

fn internal(err: impl std::fmt::Display) -> ApiError {
    error!("forecast ledger query failed: {err}");
    (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error":{"code":"LEDGER_QUERY_FAILED","message":"Could not load forecast ledger"}})))
}

async fn ready(db: &DatabaseConnection) -> Result<(), ApiError> {
    let row = db.query_one(Statement::from_string(DbBackend::Postgres,
        "SELECT to_regclass('public.forecast_score_rows') IS NOT NULL AS ready"))
        .await.map_err(internal)?.ok_or_else(|| internal("missing readiness result"))?;
    if !row.try_get::<bool>("", "ready").map_err(internal)? {
        return Err((StatusCode::SERVICE_UNAVAILABLE,Json(json!({"error":{"code":"LEDGER_NOT_ENABLED",
            "message":"Forecast ledger requires its migration and pinned worker setup"}}))));
    }
    Ok(())
}

async fn data(db: &DatabaseConnection, sql: &str, args: Vec<sea_orm::Value>) -> Result<Value, ApiError> {
    let row=db.query_one(Statement::from_sql_and_values(DbBackend::Postgres,sql,args))
        .await.map_err(internal)?.ok_or_else(|| internal("missing JSON result"))?;
    row.try_get("","data").map_err(internal)
}

#[derive(Default, Deserialize)]
pub struct LedgerQuery {
    protocol: Option<String>,
    kind: Option<String>,
    segment: Option<String>,
    event: Option<String>,
    from: Option<NaiveDate>,
    to: Option<NaiveDate>,
    limit: Option<i64>,
    offset: Option<i64>,
}

impl LedgerQuery {
    fn validate(&self) -> Result<(),ApiError> {
        if self.protocol.as_ref().is_some_and(|p|p.len()!=64 || !p.bytes().all(|c|c.is_ascii_hexdigit())) {
            return Err(bad("protocol must be a 64-character fingerprint"));
        }
        if !matches!(self.kind.as_deref().unwrap_or("official"),"all"|"official"|"ad_hoc") {
            return Err(bad("kind must be official, ad_hoc or all"));
        }
        if !matches!(self.segment.as_deref().unwrap_or("all"),"all"|"event"|"non_event"|"advance_event") {
            return Err(bad("invalid event segment"));
        }
        if self.event.as_ref().is_some_and(|e|e.is_empty() || e.len()>100 || !e.bytes().all(|c|c.is_ascii_alphanumeric() || c==b'-' || c==b'_')) {
            return Err(bad("event must be a calendar event identifier"));
        }
        if self.limit.is_some_and(|v|!(1..=100).contains(&v)) || self.offset.is_some_and(|v|!(0..=100_000).contains(&v)) {
            return Err(bad("invalid pagination: limit 1-100, offset 0-100000"));
        }
        if matches!((self.from,self.to),(Some(a),Some(b)) if a>b) {
            return Err(bad("from must not be after to"));
        }
        Ok(())
    }
}

fn unknown_protocol() -> ApiError {
    (StatusCode::NOT_FOUND,Json(json!({"error":{"code":"PROTOCOL_NOT_FOUND",
        "message":"No frozen protocol has that fingerprint"}})))
}

async fn protocol(db: &DatabaseConnection, requested: Option<&str>) -> Result<Option<String>,ApiError> {
    // An empty registry is a valid pre-first-issuance state, not a query failure.
    let row=db.query_one(Statement::from_sql_and_values(DbBackend::Postgres,
        "SELECT id FROM forecast_protocols WHERE ($1::text IS NULL OR id=$1) ORDER BY created_at DESC LIMIT 1",
        vec![requested.map(str::to_owned).into()])).await.map_err(internal)?;
    row.map(|r|r.try_get("","id").map_err(internal)).transpose()
}

pub async fn batches(State(db): State<DatabaseConnection>,Query(q):Query<LedgerQuery>) -> Result<Json<Value>,ApiError> {
    q.validate()?;
    ready(&db).await?;
    let protocols=data(&db,"SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',definition->>'name','models',definition->'models','events',coalesce(definition->'events','[]'::jsonb),'createdAt',created_at) ORDER BY created_at DESC),'[]'::jsonb) AS data FROM (SELECT * FROM forecast_protocols ORDER BY created_at DESC LIMIT 100) p",vec![]).await?;
    let id=protocol(&db,q.protocol.as_deref()).await?;
    if q.protocol.is_some() && id.is_none() { return Err(unknown_protocol()); }
    let rows=data(&db,r#"SELECT coalesce(jsonb_agg(item ORDER BY requested_at DESC,id),'[]'::jsonb) AS data FROM (
        SELECT id,requested_at,jsonb_build_object('id',id,'protocolId',protocol_id,'kind',kind,'originDate',origin_date,
          'snapshotAt',snapshot_at,'publishedAt',published_at,'status',status,'requestedAt',requested_at,
          'error',error,'datasetHash',dataset_hash,'lastQuote',snapshot->'prices'->-1->>'date',
          'total',count(*) OVER()) AS item FROM forecast_batches
        WHERE protocol_id=$1 AND ($2='all' OR kind=$2)
        ORDER BY requested_at DESC,id LIMIT $3 OFFSET $4
    ) b"#,vec![id.clone().into(),q.kind.as_deref().unwrap_or("all").to_owned().into(),q.limit.unwrap_or(30).into(),q.offset.unwrap_or(0).into()]).await?;
    Ok(Json(json!({"protocols":protocols,"protocolId":id,"batches":rows,"limit":q.limit.unwrap_or(30),"offset":q.offset.unwrap_or(0)})))
}

pub async fn batch(State(db):State<DatabaseConnection>,Path(id):Path<String>) -> Result<Json<Value>,ApiError> {
    let id=Uuid::parse_str(&id).map_err(|_|bad("Invalid batch id"))?;
    ready(&db).await?;
    let row=db.query_one(Statement::from_sql_and_values(DbBackend::Postgres,r#"
        SELECT jsonb_build_object('id',b.id,'protocolId',b.protocol_id,'kind',b.kind,'originDate',b.origin_date,
          'snapshotAt',b.snapshot_at,'publishedAt',b.published_at,'status',b.status,'error',b.error,
          'datasetHash',b.dataset_hash,'metadata',b.metadata,'models',fp.definition->'models',
          'predictions',coalesce((SELECT jsonb_agg(jsonb_build_object('model',p.model,'date',p.target_date,
              'horizon',p.horizon,'prediction',p.prediction,'lo80',p.lo80,'hi80',p.hi80,'lo95',p.lo95,'hi95',p.hi95,
              'intervalStatus',p.interval_status,'events',p.events,'actual',cp.price)
              ORDER BY p.target_date,p.model) FROM forecast_predictions p
              LEFT JOIN chicken_prices cp ON cp.price_date=p.target_date WHERE p.batch_id=b.id),'[]'::jsonb)) AS data
        FROM forecast_batches b JOIN forecast_protocols fp ON fp.id=b.protocol_id WHERE b.id=$1
    "#,vec![id.into()])).await.map_err(internal)?;
    let row=row.ok_or_else(||(StatusCode::NOT_FOUND,Json(json!({"error":{"code":"BATCH_NOT_FOUND","message":"Forecast batch not found"}}))))?;
    Ok(Json(row.try_get("","data").map_err(internal)?))
}

async fn score_data(db:&DatabaseConnection,q:&LedgerQuery) -> Result<Value,ApiError> {
    q.validate()?;
    ready(db).await?;
    let id=protocol(db,q.protocol.as_deref()).await?;
    if q.protocol.is_some() && id.is_none() { return Err(unknown_protocol()); }
    let scores=data(db,include_str!("../sql/forecast_ledger_scores.sql"),vec![id.clone().into(),
        q.kind.as_deref().unwrap_or("official").to_owned().into(),q.segment.as_deref().unwrap_or("all").to_owned().into(),
        q.from.map(|d|d.to_string()).into(),q.to.map(|d|d.to_string()).into(),q.event.clone().into()]).await?;
    Ok(json!({"protocolId":id,"kind":q.kind.as_deref().unwrap_or("official"),"segment":q.segment.as_deref().unwrap_or("all"),
        "from":q.from,"to":q.to,"event":q.event,
        "generatedAt":Utc::now(),"scores":scores,"caveat":"Matching four-model scored pairs only; overlapping origins and event days are not independent. Latest recorded actual revisions are used; evaluation history is retained. No automatic model promotion."}))
}

pub async fn scores(State(db):State<DatabaseConnection>,Query(q):Query<LedgerQuery>) -> Result<Json<Value>,ApiError> {
    Ok(Json(score_data(&db,&q).await?))
}

pub async fn report(State(db):State<DatabaseConnection>,Query(q):Query<LedgerQuery>) -> Result<([(header::HeaderName,&'static str);1],String),ApiError> {
    let result=score_data(&db,&q).await?;
    Ok(([(header::CONTENT_TYPE,"text/markdown; charset=utf-8")],render_report(&result)))
}

fn render_report(result:&Value) -> String {
    let mut text=format!("# Prospective forecast evaluation\n\nGenerated: {}\n\nProtocol: {}\n\nCohort: {}; segment: {}; event: {}\n\nActual-date filters: {} through {} (null = unbounded).\n\n{}\n\n",
        result["generatedAt"],result["protocolId"],result["kind"],result["segment"],result["event"],result["from"],result["to"],result["caveat"]);
    let fields=[("Model","model"),("Horizon days","bucket"),("Pairs","n"),("Origins","origins"),
        ("Distinct dates","uniqueDates"),("Event occurrences","eventOccurrences"),("Event calendar years","eventYears"),
        ("MAE INR/kg","mae"),("Origin-balanced MAE","originMae"),("RMSE","rmse"),("sMAPE %","smape"),("Bias","bias"),
        ("Coverage 80 fraction","coverage80"),("Interval n80","intervalN80"),("Width 80","width80"),("Interval score 80","intervalScore80"),
        ("Coverage 95 fraction","coverage95"),("Interval n95","intervalN95"),("Width 95","width95"),("Interval score 95","intervalScore95"),
        ("Last evaluated at","evaluatedAt")];
    text.push_str(&format!("| {} |\n| {} |\n",fields.iter().map(|(label,_)|*label).collect::<Vec<_>>().join(" | "),vec!["---";fields.len()].join(" | ")));
    if let Some(rows)=result["scores"].as_array() {
        for r in rows {
            text.push_str(&format!("| {} |\n",fields.iter().map(|(_,key)|r[*key].to_string()).collect::<Vec<_>>().join(" | ")));
        }
        if rows.is_empty() { text.push_str("\nNo eligible observed outcomes yet. Missing scores are not zero error.\n"); }
    }
    text.push_str("\nBias = prediction minus actual; positive means overprediction. Coverage is a fraction; missing intervals are excluded from its denominator. Daily bands are not event-average intervals. Event occurrences are distinct event identifier/start-date pairs, not independent replications; years count calendar years of event starts. Long-horizon accuracy requires matured outcomes. Corrections append evaluations without rewriting forecasts. Only outcomes first recorded strictly after publication are eligible; deleted or already-known outcomes are excluded. Official and ad-hoc cohorts must not be pooled for promotion decisions.\n");
    text
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn refuses_bad_filters() {
        assert!(LedgerQuery{kind:Some("unsafe".into()),..Default::default()}.validate().is_err());
        assert!(LedgerQuery{protocol:Some("anything".into()),..Default::default()}.validate().is_err());
        assert!(LedgerQuery{limit:Some(101),..Default::default()}.validate().is_err());
        assert!(LedgerQuery{offset:Some(-1),..Default::default()}.validate().is_err());
        assert!(LedgerQuery{segment:Some("winners".into()),..Default::default()}.validate().is_err());
        assert!(LedgerQuery{event:Some("diwali' OR 1=1".into()),..Default::default()}.validate().is_err());
    }
    #[test] fn accepts_defaults_and_correct_ranges() {
        assert!(LedgerQuery::default().validate().is_ok());
        assert!(LedgerQuery{kind:Some("ad_hoc".into()),limit:Some(20),..Default::default()}.validate().is_ok());
        assert!(LedgerQuery{from:NaiveDate::from_ymd_opt(2026,11,5),to:NaiveDate::from_ymd_opt(2026,11,4),..Default::default()}.validate().is_err());
    }
    #[test] fn report_preserves_filters_and_interval_denominators() {
        let report=render_report(&json!({"from":"2026-11-05","to":"2026-12-31","event":"diwali-window",
            "scores":[{"model":"naive","intervalN80":12,"coverage80":0.75,"intervalScore95":35.2}]}));
        for expected in ["2026-11-05","2026-12-31","diwali-window","Interval n80","Width 95","Interval score 95","Origin-balanced MAE","35.2","12"] {
            assert!(report.contains(expected),"missing {expected}");
        }
    }
}
