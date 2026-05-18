use crate::{
    db,
    models::{Customer},
};
use serde::Deserialize;
use tauri::command;

#[derive(Deserialize)]
pub struct CustomerInput {
    pub company_id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub address: Option<String>,
}

#[command]
pub fn get_customers(company_id: i64) -> Result<Vec<Customer>, String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("
            SELECT 
                c.id, c.company_id, c.name, c.phone, c.address, c.created_at,
                COALESCE((SELECT SUM(total - amount_paid) FROM estimates WHERE customer_id = c.id), 0) as balance
            FROM customers c 
            WHERE c.company_id = ?1 
            ORDER BY c.name ASC
        ")
        .map_err(|e| e.to_string())?;

    let customers = stmt
        .query_map([company_id], |row| {
            Ok(Customer {
                id: row.get(0)?,
                company_id: row.get(1)?,
                name: row.get(2)?,
                phone: row.get(3)?,
                address: row.get(4)?,
                created_at: row.get(5)?,
                balance: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(customers)
}

#[command]
pub fn create_customer(input: CustomerInput) -> Result<Customer, String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO customers (company_id, name, phone, address) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![input.company_id, input.name, input.phone, input.address],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    
    let customer = conn.query_row(
        "SELECT id, company_id, name, phone, address, created_at, 0 as balance FROM customers WHERE id = ?1",
        [id],
        |row| {
            Ok(Customer {
                id: row.get(0)?,
                company_id: row.get(1)?,
                name: row.get(2)?,
                phone: row.get(3)?,
                address: row.get(4)?,
                created_at: row.get(5)?,
                balance: row.get(6)?,
            })
        }
    ).map_err(|e| e.to_string())?;

    Ok(customer)
}

#[command]
pub fn delete_customer(id: i64) -> Result<(), String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM customers WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
