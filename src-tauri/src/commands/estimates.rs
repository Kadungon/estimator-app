use crate::{
    db,
    models::{Estimate, EstimateItem, EstimateSummary},
};
use chrono::Local;
use rusqlite::params;
use serde::Deserialize;
use tauri::command;

#[derive(Deserialize)]
pub struct EstimateItemInput {
    pub item_id: Option<i64>,
    pub name: String,
    pub unit: Option<String>,
    pub price_label: Option<String>,
    pub unit_price: f64,
    pub quantity: f64,
}

#[derive(Deserialize)]
pub struct EstimateInput {
    pub company_id: i64,
    pub customer: Option<String>,
    pub notes: Option<String>,
    pub subtotal: f64,
    pub discount: f64,
    pub total: f64,
    pub items: Vec<EstimateItemInput>,
}

fn _generate_next_est_number(conn: &rusqlite::Connection, company_id: i64) -> Result<String, String> {
    let year = Local::now().format("%Y").to_string();
    let prefix = format!("EST-{}-", year);
    
    // Find the max number suffix for the current year/company
    // We use CAST to ensure numeric sorting of the suffix
    let max_suffix: Option<i64> = conn.query_row(
        "SELECT MAX(CAST(SUBSTR(est_number, LENGTH(?1) + 1) AS INTEGER)) 
         FROM estimates 
         WHERE company_id = ?2 AND est_number LIKE ?1 || '%'",
        params![prefix, company_id],
        |r| r.get(0),
    ).unwrap_or(None);

    let next_num = max_suffix.unwrap_or(0) + 1;
    Ok(format!("{}{:03}", prefix, next_num))
}

#[command]
pub fn get_next_estimate_number(company_id: i64) -> Result<String, String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    _generate_next_est_number(&conn, company_id)
}

#[command]
pub fn get_estimates(company_id: i64, search: Option<String>, customer: Option<String>) -> Result<Vec<EstimateSummary>, String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    let pattern = format!("%{}%", search.unwrap_or_default().to_lowercase());
    
    let mut query = "SELECT id, est_number, customer, total, created_at FROM estimates WHERE company_id = ?1".to_string();
    let mut params: Vec<rusqlite::types::Value> = vec![company_id.into()];
    
    if let Some(c) = customer {
        if !c.is_empty() {
            query.push_str(" AND customer = ?");
            params.push(c.into());
        }
    }
    
    query.push_str(" AND (LOWER(COALESCE(customer,'')) LIKE ? OR LOWER(est_number) LIKE ?)");
    params.push(pattern.clone().into());
    params.push(pattern.into());
    
    query.push_str(" ORDER BY created_at DESC LIMIT 100");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let list = stmt
        .query_map(rusqlite::params_from_iter(params), |row| {
            Ok(EstimateSummary {
                id: row.get(0)?,
                est_number: row.get(1)?,
                customer: row.get(2)?,
                total: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(list)
}

#[command]
pub fn get_unique_customers(company_id: i64) -> Result<Vec<String>, String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT DISTINCT customer FROM estimates WHERE company_id = ?1 AND customer IS NOT NULL AND customer != '' ORDER BY customer ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([company_id], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    
    let mut customers = Vec::new();
    for row in rows {
        customers.push(row.map_err(|e| e.to_string())?);
    }
    Ok(customers)
}

fn _get_estimate(conn: &rusqlite::Connection, id: i64) -> Result<Estimate, String> {
    let est = conn
        .query_row(
            "SELECT id, company_id, est_number, customer, notes, subtotal, discount, total, pdf_path, created_at
             FROM estimates WHERE id = ?1",
            [id],
            |row| {
                Ok(Estimate {
                    id: row.get(0)?,
                    company_id: row.get(1)?,
                    est_number: row.get(2)?,
                    customer: row.get(3)?,
                    notes: row.get(4)?,
                    subtotal: row.get(5)?,
                    discount: row.get(6)?,
                    total: row.get(7)?,
                    pdf_path: row.get(8)?,
                    created_at: row.get(9)?,
                    items: vec![],
                })
            },
        )
        .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, estimate_id, item_id, name, unit, price_label, unit_price, quantity, line_total
             FROM estimate_items WHERE estimate_id = ?1 ORDER BY id",
        )
        .map_err(|e| e.to_string())?;
    let items: Vec<EstimateItem> = stmt
        .query_map([est.id], |row| {
            Ok(EstimateItem {
                id: row.get(0)?,
                estimate_id: row.get(1)?,
                item_id: row.get(2)?,
                name: row.get(3)?,
                unit: row.get(4)?,
                price_label: row.get(5)?,
                unit_price: row.get(6)?,
                quantity: row.get(7)?,
                line_total: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(Estimate { items, ..est })
}

#[command]
pub fn get_estimate(id: i64) -> Result<Estimate, String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    _get_estimate(&conn, id)
}

#[command]
pub fn save_estimate(input: EstimateInput) -> Result<Estimate, String> {
    let mut conn = db::get().lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let est_number = _generate_next_est_number(&tx, input.company_id)?;

    tx.execute(
        "INSERT INTO estimates (company_id, est_number, customer, notes, subtotal, discount, total)
         VALUES (?1,?2,?3,?4,?5,?6,?7)",
        params![
            input.company_id,
            est_number,
            input.customer,
            input.notes,
            input.subtotal,
            input.discount,
            input.total
        ],
    )
    .map_err(|e| e.to_string())?;
    
    let est_id = tx.last_insert_rowid();

    for item in &input.items {
        let line_total = item.unit_price * item.quantity;
        tx.execute(
            "INSERT INTO estimate_items (estimate_id, item_id, name, unit, price_label, unit_price, quantity, line_total)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
            params![
                est_id,
                item.item_id,
                item.name,
                item.unit,
                item.price_label,
                item.unit_price,
                item.quantity,
                line_total
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    let estimate = _get_estimate(&tx, est_id)?;
    tx.commit().map_err(|e| e.to_string())?;

    Ok(estimate)
}

#[command]
pub fn delete_estimate(id: i64) -> Result<(), String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM estimates WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

