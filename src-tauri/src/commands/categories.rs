use crate::{db, models::Category};
use tauri::command;

#[command]
pub fn get_categories(company_id: i64) -> Result<Vec<Category>, String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, company_id, name, created_at FROM categories WHERE company_id = ?1 ORDER BY name")
        .map_err(|e| e.to_string())?;
    let cats = stmt
        .query_map([company_id], |row| {
            Ok(Category {
                id: row.get(0)?,
                company_id: row.get(1)?,
                name: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(cats)
}

#[command]
pub fn create_category(company_id: i64, name: String) -> Result<Category, String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO categories (company_id, name) VALUES (?1, ?2)", rusqlite::params![company_id, name])
        .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    let cat: Category = conn
        .query_row(
            "SELECT id, company_id, name, created_at FROM categories WHERE id = ?1",
            [id],
            |row| {
                Ok(Category {
                    id: row.get(0)?,
                    company_id: row.get(1)?,
                    name: row.get(2)?,
                    created_at: row.get(3)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;
    Ok(cat)
}


#[command]
pub fn delete_category(id: i64) -> Result<(), String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM categories WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
