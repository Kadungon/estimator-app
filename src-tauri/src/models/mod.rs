use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Company {
    pub id: i64,
    pub name: String,
    pub address: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub role: String,
    #[serde(default)]
    pub companies: Vec<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Category {
    pub id: i64,
    #[serde(default)]
    pub company_id: i64,
    pub name: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Unit {
    pub id: i64,
    #[serde(default)]
    pub company_id: i64,
    pub name: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Customer {
    pub id: i64,
    #[serde(default)]
    pub company_id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub created_at: String,
    #[serde(default)]
    pub balance: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ItemPrice {
    #[serde(default)]
    pub id: i64,
    #[serde(default)]
    pub item_id: i64,
    pub label: String,
    pub price: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Item {
    #[serde(default)]
    pub id: i64,
    #[serde(default)]
    pub company_id: i64,
    pub sku: Option<String>,
    pub name: String,
    pub unit: Option<String>,
    pub description: Option<String>,
    pub category_id: Option<i64>,
    pub category_name: Option<String>,
    #[serde(default)]
    pub stock: f64,
    pub prices: Vec<ItemPrice>,
    #[serde(default)]
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EstimateItem {
    #[serde(default)]
    pub id: i64,
    #[serde(default)]
    pub estimate_id: i64,
    pub item_id: Option<i64>,
    pub name: String,
    pub unit: Option<String>,
    pub price_label: Option<String>,
    pub unit_price: f64,
    pub quantity: f64,
    #[serde(default)]
    pub line_total: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Estimate {
    #[serde(default)]
    pub id: i64,
    #[serde(default)]
    pub company_id: i64,
    pub est_number: String,
    pub customer: Option<String>,
    pub customer_id: Option<i64>,
    pub notes: Option<String>,
    pub subtotal: f64,
    pub discount: f64,
    pub total: f64,
    #[serde(default)]
    pub amount_paid: f64,
    pub items: Vec<EstimateItem>,
    pub created_at: String,
    pub pdf_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EstimateSummary {
    pub id: i64,
    pub est_number: String,
    pub customer: Option<String>,
    pub total: f64,
    #[serde(default)]
    pub amount_paid: f64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub shop_name: String,
    pub shop_address: String,
    pub shop_phone: String,
    pub shop_email: String,
    pub theme: String,
    pub pdf_layout: String,
    pub confirm_save: String,
}

