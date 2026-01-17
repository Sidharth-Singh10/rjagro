use chrono::NaiveDate;
use sea_orm::prelude::Decimal;
use serde::Deserialize;

pub struct FarmerDetails {
    pub farmer_name: String,
    pub farmer_id: i32,
    pub phone_number: String,
    pub date: NaiveDate,
    pub batch_id: i32,
}

impl FarmerDetails {
    pub fn get_batch_id(&self) -> String {
        self.batch_id.to_string()
    }
}

pub struct BatchInformation {
    pub chick_place_date: NaiveDate,
    pub final_liq_date: NaiveDate,
    pub age_liq: i32,
    pub avg_lift_age: Option<i32>,
}

impl BatchInformation {
    pub fn get_chick_place_date(&self) -> String {
        self.chick_place_date.to_string()
    }
    pub fn get_final_liq_date(&self) -> String {
        self.final_liq_date.to_string()
    }
    pub fn get_age_liq(&self) -> String {
        self.age_liq.to_string()
    }
    pub fn avg_lift_age(&self) -> String {
        match self.avg_lift_age {
            Some(age) => age.to_string(),
            None => "N/A".to_string(),
        }
    }
}

#[derive(Clone)]
pub struct BatchSalesInfo {
    pub total_birds_sold: Decimal,
    pub total_weight: Decimal,
    pub avg_weight: Decimal,
    pub avg_selling_rate: Decimal,
    pub fcr: Option<Decimal>,
    pub converted_fcr: Option<Decimal>,
}

impl BatchSalesInfo {
    pub fn get_total_birds(&self) -> String {
        self.total_birds_sold.to_string()
    }

    pub fn get_total_weight(&self) -> String {
        self.total_weight.to_string()
    }
    pub fn get_avg_weight(&self) -> String {
        self.avg_weight.to_string()
    }
    pub fn get_avg_selling_rate(&self) -> String {
        self.avg_selling_rate.to_string()
    }
    pub fn get_fcr(&self) -> String {
        match self.fcr {
            Some(num) => num.to_string(),
            None => "N/A".to_string(),
        }
    }
    pub fn get_converted_fcr(&self) -> String {
        match self.fcr {
            Some(num) => num.to_string(),
            None => "N/A".to_string(),
        }
    }
}

pub struct BatchExpenses {
    pub net_chicks: Decimal,
    pub chicks_cost: Decimal,
    pub cum_mortality: Decimal,
    pub total_mortality_per: Decimal,
    pub first_week_mortality: Option<Decimal>,
    pub first_week_mortality_per: Option<Decimal>,
    pub first_week_mortality_deduction: Option<Decimal>,
    pub after_seven_days_mortality: Option<Decimal>,
    pub after_thirty_days_mortality: Option<Decimal>,
    pub culls: Option<Decimal>,
    pub feed_consumed_kg: Decimal,
    pub feed_cost: Decimal,
    pub medicine_cost: Decimal,
    pub medicine_cost_per_bird: Decimal,
    pub admin_cost: Decimal,
    pub gross_production_cost: Decimal,
    pub actual_production_cost_per_kg: Decimal,
    pub standard_production_cost_per_kg: Decimal,
}

impl BatchExpenses {
    fn format_opt(&self, val: &Option<Decimal>) -> String {
        match val {
            Some(v) => v.to_string(),
            None => "N/A".to_string(),
        }
    }

    // --- Basic Chick Data ---
    pub fn get_net_chicks(&self) -> String {
        self.net_chicks.to_string()
    }

    pub fn get_chicks_cost(&self) -> String {
        self.chicks_cost.to_string()
    }

    // --- Mortality Data ---
    pub fn get_cum_mortality(&self) -> String {
        self.cum_mortality.to_string()
    }

    pub fn get_total_mortality_per(&self) -> String {
        self.total_mortality_per.to_string()
    }

    pub fn get_first_week_mortality(&self) -> String {
        self.format_opt(&self.first_week_mortality)
    }

    pub fn get_first_week_mortality_per(&self) -> String {
        self.format_opt(&self.first_week_mortality_per)
    }

    pub fn get_first_week_mortality_deduction(&self) -> String {
        self.format_opt(&self.first_week_mortality_deduction)
    }

    pub fn get_after_seven_days_mortality(&self) -> String {
        self.format_opt(&self.after_seven_days_mortality)
    }

    pub fn get_after_thirty_days_mortality(&self) -> String {
        self.format_opt(&self.after_thirty_days_mortality)
    }

    pub fn get_culls(&self) -> String {
        self.format_opt(&self.culls)
    }

    pub fn get_feed_consumed_kg(&self) -> String {
        self.feed_consumed_kg.to_string()
    }

    pub fn get_feed_cost(&self) -> String {
        self.feed_cost.to_string()
    }

    // --- Medicine & Admin ---
    pub fn get_medicine_cost(&self) -> String {
        self.medicine_cost.to_string()
    }

    pub fn get_medicine_cost_per_bird(&self) -> String {
        self.medicine_cost_per_bird.to_string()
    }

    pub fn get_admin_cost(&self) -> String {
        self.admin_cost.to_string()
    }

    pub fn get_gross_production_cost(&self) -> String {
        self.gross_production_cost.to_string()
    }

    pub fn get_actual_production_cost_per_kg(&self) -> String {
        self.actual_production_cost_per_kg.to_string()
    }

    pub fn get_standard_production_cost_per_kg(&self) -> String {
        "87".to_string()
    }
}

pub struct RearingCharges {
    pub rearing_charges_per_kg: Decimal,
    pub std_rearing_charges_per_kg: Decimal,
    pub prod_cost_incentives: Option<Decimal>,
    pub rearing_charges_per_bird: Decimal,
    pub total_rearing_charges: Decimal,
    pub fcr_deduct_earning: Option<Decimal>,
    pub mortality_deduct_earning: Option<Decimal>,
    pub other_deduction: Decimal,
    pub bird_shortage_cost: Decimal,
    pub fcr_incentives: Decimal,
    pub market_incentives: Decimal,
    pub charges_payable: Decimal,
    pub tds_percentage: Decimal,
    pub net_growing_charges: Decimal,
}

impl RearingCharges {
    fn format_opt(&self, val: &Option<Decimal>) -> String {
        match val {
            Some(v) => v.to_string(),
            None => "N/A".to_string(),
        }
    }

    pub fn get_rearing_charges_per_kg(&self) -> String {
        self.rearing_charges_per_kg.to_string()
    }

    pub fn get_std_rearing_charges_per_kg(&self) -> String {
        self.std_rearing_charges_per_kg.to_string()
    }

    pub fn get_prod_cost_incentives(&self) -> String {
        self.format_opt(&self.prod_cost_incentives)
    }

    pub fn get_rearing_charges_per_bird(&self) -> String {
        self.rearing_charges_per_bird.to_string()
    }

    pub fn get_total_rearing_charges(&self) -> String {
        self.total_rearing_charges.to_string()
    }

    // --- Deductions & Earnings ---
    pub fn get_fcr_deduct_earning(&self) -> String {
        self.format_opt(&self.fcr_deduct_earning)
    }

    pub fn get_mortality_deduct_earning(&self) -> String {
        self.format_opt(&self.mortality_deduct_earning)
    }

    pub fn get_other_deduction(&self) -> String {
        self.other_deduction.to_string()
    }

    pub fn get_bird_shortage_cost(&self) -> String {
        self.bird_shortage_cost.to_string()
    }

    pub fn get_fcr_incentives(&self) -> String {
        self.fcr_incentives.to_string()
    }

    pub fn get_market_incentives(&self) -> String {
        self.market_incentives.to_string()
    }

    // --- Final Calculations ---
    pub fn get_charges_payable(&self) -> String {
        self.charges_payable.to_string()
    }

    pub fn get_tds_percentage(&self) -> String {
        self.tds_percentage.to_string()
    }

    pub fn get_net_growing_charges(&self) -> String {
        self.net_growing_charges.to_string()
    }
}

// confirm once to make a few fields optional to show 'N/A'
#[derive(Clone, Deserialize)]
pub struct Inputs {
    pub batch_id: i32,
    pub bird_shortage: Decimal,
    pub other_deduction: Decimal,
    pub bird_shortage_cost: Decimal,
    pub fcr_incentive: Decimal,
    pub market_incentive: Decimal,
    pub tds_per: Decimal,
}

pub struct PaymentInformation {
    pub total_payable_amount: Decimal,
    pub account_holder_name: String,
    pub account_number: String,
    pub ifsc_code: String,
    pub account_type: Option<String>,
}

impl PaymentInformation {
    pub fn get_total_payable_amount(&self) -> String {
        format!("{} INR Only", self.total_payable_amount)
    }
    pub fn get_account_holder_name(&self) -> String {
        self.account_holder_name.to_string()
    }
    pub fn get_account_number(&self) -> String {
        self.account_number.to_string()
    }
    pub fn get_ifsc_code(&self) -> String {
        self.ifsc_code.to_string()
    }
    pub fn get_account_type(&self) -> String {
        match &self.account_type {
            Some(num) => num.to_string(),
            None => "N/A".to_string(),
        }
    }
}
