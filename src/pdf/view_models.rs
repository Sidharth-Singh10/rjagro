use chrono::NaiveDate;
use sea_orm::prelude::Decimal;

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
