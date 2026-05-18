use crate::{
    db,
    models::{Unit},
};
use serde::Deserialize;
use tauri::command;

#[derive(Deserialize)]
pub struct UnitInput {
    pub company_id: i64,
    pub name: String,
}

#[command]
pub fn get_units(company_id: i64) -> Result<Vec<Unit>, String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, company_id, name, created_at FROM units WHERE company_id = ?1 ORDER BY name ASC")
        .map_err(|e| e.to_string())?;

    let units = stmt
        .query_map([company_id], |row| {
            Ok(Unit {
                id: row.get(0)?,
                company_id: row.get(1)?,
                name: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(units)
}

#[command]
pub fn create_unit(input: UnitInput) -> Result<Unit, String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO units (company_id, name) VALUES (?1, ?2)",
        rusqlite::params![input.company_id, input.name],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    
    let unit = conn.query_row(
        "SELECT id, company_id, name, created_at FROM units WHERE id = ?1",
        [id],
        |row| {
            Ok(Unit {
                id: row.get(0)?,
                company_id: row.get(1)?,
                name: row.get(2)?,
                created_at: row.get(3)?,
            })
        }
    ).map_err(|e| e.to_string())?;

    Ok(unit)
}

#[command]
pub fn delete_unit(id: i64) -> Result<(), String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM units WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
