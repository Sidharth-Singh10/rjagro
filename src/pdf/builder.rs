use crate::pdf::view_models::BatchSalesInfo;
use crate::pdf::view_models::{BatchInformation, FarmerDetails};
use chrono::Local;
use entity::{batch_closure_summary, batch_sales, batches, bird_count_history, farmers};
use num_traits::FromPrimitive;
use sea_orm::prelude::Decimal;
use sea_orm::ColumnTrait;
use sea_orm::EntityTrait;
use sea_orm::QueryFilter;
use sea_orm::QueryOrder;
use sea_orm::{DatabaseConnection, DbErr};

pub async fn build_farmer_details(
    db: &DatabaseConnection,
    batch_id: i32,
) -> Result<FarmerDetails, DbErr> {
    let result = batches::Entity::find_by_id(batch_id)
        .find_also_related(farmers::Entity)
        .one(db)
        .await?;

    match result {
        Some((batch, Some(farmer))) => {
            Ok(FarmerDetails {
                farmer_name: farmer.name,
                farmer_id: farmer.farmer_id,
                phone_number: farmer.phone_number,
                // local??
                date: Local::now().date_naive(),
                batch_id: batch.batch_id,
            })
        }

        Some((_, None)) => Err(DbErr::Custom(
            "Batch found but no associated farmer exists.".to_owned(),
        )),

        None => Err(DbErr::RecordNotFound(format!(
            "Batch with ID {} not found",
            batch_id
        ))),
    }
}

pub async fn build_batch_info(
    db: &DatabaseConnection,
    batch_id: i32,
) -> Result<BatchInformation, DbErr> {
    let batch = batches::Entity::find_by_id(batch_id)
        .one(db)
        .await?
        .ok_or_else(|| DbErr::RecordNotFound(format!("Batch {} not found", batch_id)))?;

    // Convert DateTimeWithTimeZone to NaiveDate
    let chick_place_date = batch.created_at.date_naive();

    // 2. Find the last record in bird_count_history to get 'final_liq_date'
    // We filter by batch_id and order by record_date DESC to get the latest entry.
    let last_record = bird_count_history::Entity::find()
        .filter(bird_count_history::Column::BatchId.eq(batch_id))
        .order_by_desc(bird_count_history::Column::RecordDate)
        .one(db)
        .await?;

    // Determine final_liq_date
    // If no history exists, we default to chick_place_date (age will be 0)
    let final_liq_date = match last_record {
        Some(record) => record.record_date,
        None => chick_place_date,
    };

    // 3. Calculate Age (Difference in days)
    // .signed_duration_since returns a Duration, .num_days() returns i64
    let age_liq = final_liq_date
        .signed_duration_since(chick_place_date)
        .num_days() as i32;

    Ok(BatchInformation {
        chick_place_date,
        final_liq_date,
        age_liq,
        avg_lift_age: None,
    })
}

pub async fn build_batch_sales_info(
    db: &DatabaseConnection,
    batch_id: i32,
) -> Result<BatchSalesInfo, DbErr> {
    // 1. Fetch all sales records for this batch
    let sales = batch_sales::Entity::find()
        .filter(batch_sales::Column::BatchId.eq(batch_id))
        .all(db)
        .await?;

    // 2. Fetch the closure summary (for revenue)
    let summary = batch_closure_summary::Entity::find()
        .filter(batch_closure_summary::Column::BatchId.eq(batch_id))
        .one(db)
        .await?;

    // --- Calculations ---

    // A. Total Birds Sold: Sum of 'quantity'
    let total_birds_sold = sales.iter().map(|s| s.quantity).sum();

    let total_weight = sales.iter().map(|s| s.avg_weight).sum();

    // C. Average Weight: Total Weight / Total Birds
    let avg_weight = total_weight / total_birds_sold;

    // D. Average Selling Rate: Revenue / Total Weight
    let avg_selling_rate = if let Some(s) = summary {
        s.revenue / total_weight
    } else {
        Decimal::from_f32(0.0).unwrap() // Default value when summary is None
    };

    Ok(BatchSalesInfo {
        total_birds_sold,
        total_weight,
        avg_weight,
        avg_selling_rate,
        fcr: None,
        converted_fcr: None,
    })
}
