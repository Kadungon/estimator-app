use crate::db;
use tauri::{command, Manager};
use std::fs;

#[command]
pub fn backup_db(app_handle: tauri::AppHandle) -> Result<String, String> {
    let db_path = db::get_db_path(&app_handle)?;
    let mut backup_path = db_path.clone();
    
    let now = chrono::Local::now();
    let timestamp = now.format("%Y%m%d_%H%M%S").to_string();
    
    let file_name = format!("quickestimate_backup_{}.db", timestamp);
    backup_path.set_file_name(file_name);
    
    fs::copy(&db_path, &backup_path).map_err(|e| format!("Failed to copy database: {}", e))?;
    
    Ok(backup_path.to_string_lossy().to_string())
}

#[command]
pub fn reset_data(company_id: i64) -> Result<(), String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    
    // Delete estimates and their items for the company
    conn.execute("DELETE FROM estimate_items WHERE estimate_id IN (SELECT id FROM estimates WHERE company_id = ?1)", [company_id]).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM estimates WHERE company_id = ?1", [company_id]).map_err(|e| e.to_string())?;
    
    // Delete items and their prices for the company
    conn.execute("DELETE FROM item_prices WHERE item_id IN (SELECT id FROM items WHERE company_id = ?1)", [company_id]).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM items WHERE company_id = ?1", [company_id]).map_err(|e| e.to_string())?;
    
    // Delete categories for the company
    conn.execute("DELETE FROM categories WHERE company_id = ?1", [company_id]).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[command]
pub fn get_db_info(app_handle: tauri::AppHandle) -> Result<String, String> {
    let path = db::get_db_path(&app_handle)?;
    Ok(path.to_string_lossy().to_string())
}

#[command]
pub fn set_db_path(app_handle: tauri::AppHandle, path: String) -> Result<(), String> {
    let exe_dir = app_handle.path().executable_dir().map_err(|e| e.to_string())?;
    let config_path = exe_dir.join("db_path.json");
    
    let path_json = serde_json::to_string(&path).map_err(|e| e.to_string())?;
    fs::write(config_path, path_json).map_err(|e| e.to_string())?;
    
    Ok(())
}
