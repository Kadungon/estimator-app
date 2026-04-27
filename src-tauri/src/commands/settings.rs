use crate::db;
use std::collections::HashMap;
use tauri::command;

#[command]
pub fn get_settings() -> Result<HashMap<String, String>, String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;
    let map: HashMap<String, String> = stmt
        .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(map)
}

#[command]
pub fn update_settings(updates: HashMap<String, String>) -> Result<(), String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    for (key, value) in updates {
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            rusqlite::params![key, value],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}
