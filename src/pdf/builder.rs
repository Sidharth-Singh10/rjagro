use crate::pdf::contexts::BatchExpensesCalculationContext;
use crate::pdf::view_models::{
    BatchExpenses, BatchSalesInfo, Inputs, PaymentInformation, RearingCharges,
};
use crate::pdf::view_models::{BatchInformation, FarmerDetails};
use chrono::{Duration, Local};
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
    let avg_weight: Decimal =
        (Decimal::from(total_weight) / Decimal::from(total_birds_sold)).round_dp(2);

    // D. Average Selling Rate: Revenue / Total Weight
    let avg_selling_rate = if let Some(s) = summary {
        (Decimal::from(s.revenue) / Decimal::from(total_weight)).round_dp(2)
    } else {
        Decimal::from_f32(0.0).unwrap()
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

pub fn calculate_batch_expenses(ctx: BatchExpensesCalculationContext) -> BatchExpenses {
    let zero = Decimal::ZERO;
    let one_hundred = Decimal::from(100);

    // 1. Net Chicks
    let net_chicks = Decimal::from(ctx.batch.initial_bird_count);

    // 2. Chicks Cost (Fixed rate 35)
    let chicks_cost = net_chicks * Decimal::from(35);

    // 3. Mortality Calculations
    let total_birds_sold = ctx.sales_info.total_birds_sold;
    let bird_shortage = ctx.input.bird_shortage;

    // Formula: net_chicks - sold - shortage
    let cum_mortality = net_chicks - total_birds_sold - bird_shortage;

    // Total Mortality %
    let total_mortality_per = if net_chicks > zero {
        (cum_mortality / net_chicks) * one_hundred
    } else {
        zero
    };

    // Date-based Mortality
    let start_date = ctx.batch.start_date;
    let day_7 = start_date + Duration::days(7);
    let day_30 = start_date + Duration::days(30);

    let mut first_week_deaths = 0;
    let mut after_7_days_deaths = 0;
    let mut after_30_days_deaths = 0;

    for record in &ctx.bird_history {
        if record.record_date >= start_date && record.record_date <= day_7 {
            first_week_deaths += record.deaths;
        }
        if record.record_date > day_7 {
            after_7_days_deaths += record.deaths;
        }
        if record.record_date > day_30 {
            after_30_days_deaths += record.deaths;
        }
    }

    let first_week_mortality = Decimal::from(first_week_deaths);
    let after_seven_days_mortality = Decimal::from(after_7_days_deaths);
    let after_thirty_days_mortality = Decimal::from(after_30_days_deaths);

    let first_week_mortality_per = if net_chicks > zero {
        (first_week_mortality / net_chicks) * one_hundred
    } else {
        zero
    };

    // 4. Feed Calculations (Category = "feed")
    // Logic: Sum(Allocated Qty) - Sum(Returned Qty)
    let feed_allocated: Decimal = ctx
        .allocations_with_category
        .iter()
        .filter(|(_, cat)| cat == "feed")
        .map(|(line, _)| line.qty)
        .sum();

    let feed_returned: Decimal = ctx
        .returns_with_category
        .iter()
        .filter(|(_, cat)| cat == "feed")
        .map(|(ret, _)| ret.return_qty)
        .sum();

    let feed_consumed_kg = (feed_allocated - feed_returned) * Decimal::from(50);

    // Feed Cost (Fixed rate 41 per kg as per prompt)
    let feed_cost = feed_consumed_kg * Decimal::from(41);

    // 5. Medicine Calculations (Category = "medicine")
    // Logic: Sum(Line Value) - Sum(Return Value) -> We need cost, not just qty
    let med_allocated_cost: Decimal = ctx
        .allocations_with_category
        .iter()
        .filter(|(_, cat)| cat == "medicine")
        .map(|(line, _)| line.line_value)
        .sum();

    let med_returned_cost: Decimal = ctx
        .returns_with_category
        .iter()
        .filter(|(_, cat)| cat == "medicine")
        .map(|(ret, _)| ret.return_value)
        .sum();

    let medicine_cost = med_allocated_cost - med_returned_cost;

    let medicine_cost_per_bird = if net_chicks > zero {
        medicine_cost / net_chicks
    } else {
        zero
    };

    // 6. Admin Cost (Fixed rate 5 per bird)
    let admin_cost = net_chicks * Decimal::from(5);

    // 7. Gross Production Cost
    let gross_production_cost = chicks_cost + feed_cost + medicine_cost + admin_cost;

    // 8. Actual Production Cost / KG
    let total_weight = ctx.sales_info.total_weight;
    let actual_production_cost_per_kg = if total_weight > zero {
        gross_production_cost / total_weight
    } else {
        zero
    };

    BatchExpenses {
        net_chicks,
        chicks_cost,
        cum_mortality,
        total_mortality_per: total_mortality_per.round_dp(2),
        first_week_mortality: Some(first_week_mortality),
        first_week_mortality_per: Some(first_week_mortality_per.round_dp(2)),
        first_week_mortality_deduction: None,
        after_seven_days_mortality: Some(after_seven_days_mortality),
        after_thirty_days_mortality: Some(after_thirty_days_mortality),
        culls: None,
        feed_consumed_kg,
        feed_cost,
        medicine_cost,
        medicine_cost_per_bird: medicine_cost_per_bird.round_dp(2),
        admin_cost,
        gross_production_cost,
        actual_production_cost_per_kg: actual_production_cost_per_kg.round_dp(2),
        // Create Default
        standard_production_cost_per_kg: Decimal::from(87), // Hardcoded 87
    }
}

pub async fn build_rearing_charges(
    batch_expenses: &BatchExpenses,
    batch_sales: &BatchSalesInfo,
    inputs: &Inputs,
) -> Result<RearingCharges, DbErr> {
    let base_rate = Decimal::from(8);
    let diff_cost = batch_expenses.actual_production_cost_per_kg
        - batch_expenses.standard_production_cost_per_kg;

    // refactor thisss
    let penalty_or_bonus = diff_cost
        * Decimal::try_from(0.5)
            .map_err(|e| DbErr::Custom(format!("Failed to convert 0.5 to Decimal: {}", e)))?;

    let std_rearing_charges_per_kg = base_rate - penalty_or_bonus;

    // 2. Production Cost Incentives (Hardcoded to None)
    let prod_cost_incentives: Option<Decimal> = None;
    let prod_cost_incentives_val = prod_cost_incentives.unwrap_or(Decimal::ZERO);

    // 3. Rearing Charges per KG
    // Formula: STD + PROD.COST INCENTIVES
    let rearing_charges_per_kg = std_rearing_charges_per_kg + prod_cost_incentives_val;

    // 4. Total Rearing Charges
    // Formula: rate_per_kg * total_weight
    let total_rearing_charges = (Decimal::from(rearing_charges_per_kg)
        * Decimal::from(batch_sales.total_weight))
    .round_dp(2);

    // 5. Rearing Charges per Bird
    // Formula: total_rearing / total_birds_sold
    let rearing_charges_per_bird = (Decimal::from(total_rearing_charges)
        / Decimal::from(batch_sales.total_birds_sold))
    .round_dp(2);

    // 6. Hardcoded Nones
    let fcr_deduct_earning: Option<Decimal> = None;
    let mortality_deduct_earning: Option<Decimal> = None;

    // 7. Input mappings
    let other_deduction = inputs.other_deduction;
    let bird_shortage_cost = inputs.bird_shortage_cost;
    let fcr_incentives = inputs.fcr_incentive;
    let market_incentives = inputs.market_incentive;
    let tds_percentage = inputs.tds_per;

    // 8. Calculate Charges Payable (Net before TDS)
    // Sum = (Total Rearing + Incentives) - (Deductions)
    let charges_payable = total_rearing_charges + fcr_incentives + market_incentives
        - other_deduction
        - bird_shortage_cost;
    // Note: fcr/mortality deductions are None, so ignored here.

    // 9. Calculate Net Growing Charges
    // Formula: payable - (tds% * payable)
    // Note: Assuming tds_percentage is a rate (e.g. 0.01 for 1%) or user handles the scale.
    // If inputs.tds_per is 2.0 (representing 2%), this logic might need division by 100.
    // Based strictly on the prompt: (tds_percentage * charges_payable)
    let tds_amount = tds_percentage * charges_payable;
    let net_growing_charges = charges_payable - tds_amount;

    Ok(RearingCharges {
        rearing_charges_per_kg,
        std_rearing_charges_per_kg,
        prod_cost_incentives,
        rearing_charges_per_bird,
        total_rearing_charges,
        fcr_deduct_earning,
        mortality_deduct_earning,
        other_deduction,
        bird_shortage_cost,
        fcr_incentives,
        market_incentives,
        charges_payable,
        tds_percentage,
        net_growing_charges,
    })
}

pub async fn build_payment_info(
    batch_expenses: &RearingCharges,
    db: &DatabaseConnection,
    batch_id: i32,
) -> Result<PaymentInformation, DbErr> {
    let result = batches::Entity::find_by_id(batch_id)
        .find_also_related(farmers::Entity)
        .one(db)
        .await?;

    let (_batch, farmer_opt) =
        result.ok_or_else(|| DbErr::Custom(format!("Batch with ID {} not found", batch_id)))?;

    let farmer = farmer_opt
        .ok_or_else(|| DbErr::Custom("Associated farmer not found for this batch".to_owned()))?;

    let payment_info = PaymentInformation {
        total_payable_amount: batch_expenses.net_growing_charges,
        account_holder_name: farmer.name,
        account_number: farmer.bank_account_no,
        ifsc_code: farmer.ifsc_code,
        account_type: None,
    };

    Ok(payment_info)
}
