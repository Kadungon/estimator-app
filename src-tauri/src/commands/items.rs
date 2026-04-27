use crate::{db, models::{Item, ItemPrice}};
use rusqlite::params;
use tauri::command;

fn _get_item(conn: &rusqlite::Connection, id: i64) -> Result<Item, String> {
    let mut stmt = conn.prepare("
        SELECT i.id, i.company_id, i.sku, i.name, i.unit, i.description, i.category_id, c.name as category_name, i.created_at
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        WHERE i.id = ?1
    ").map_err(|e| e.to_string())?;

    let mut item = stmt.query_row(params![id], |row| {
        Ok(Item {
            id: row.get(0)?,
            company_id: row.get(1)?,
            sku: row.get(2)?,
            name: row.get(3)?,
            unit: row.get(4)?,
            description: row.get(5)?,
            category_id: row.get(6)?,
            category_name: row.get(7)?,
            created_at: row.get(8)?,
            prices: Vec::new(),
        })
    }).map_err(|e| e.to_string())?;

    // Load prices
    let mut p_stmt = conn.prepare("SELECT id, item_id, label, price FROM item_prices WHERE item_id = ?1").map_err(|e| e.to_string())?;
    let prices = p_stmt.query_map(params![id], |row| {
        Ok(ItemPrice {
            id: row.get(0)?,
            item_id: row.get(1)?,
            label: row.get(2)?,
            price: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?;

    for p in prices {
        item.prices.push(p.map_err(|e| e.to_string())?);
    }

    Ok(item)
}

#[command]
pub fn get_items(company_id: i64, pattern: String, category_id: Option<i64>) -> Result<Vec<Item>, String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    let pattern = format!("%{}%", pattern.to_lowercase());

    let mut sql = "
        SELECT i.id
        FROM items i
        WHERE i.company_id = ?1 AND (LOWER(i.name) LIKE ?2 OR LOWER(i.sku) LIKE ?2)
    ".to_string();

    let mut params: Vec<rusqlite::types::Value> = vec![company_id.into(), pattern.into()];

    if let Some(cat_id) = category_id {
        sql.push_str(" AND i.category_id = ?3");
        params.push(cat_id.into());
    }

    sql.push_str(" ORDER BY i.name LIMIT 50");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params_from_iter(params), |row| row.get::<_, i64>(0))
        .map_err(|e| e.to_string())?;

    let ids: Vec<i64> = rows.filter_map(|r| r.ok()).collect();

    let mut items = Vec::new();
    for id in ids {
        items.push(_get_item(&conn, id)?);
    }
    Ok(items)
}

#[command]
pub fn get_item(id: i64) -> Result<Item, String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    _get_item(&conn, id)
}

#[command]
pub fn create_item(payload: Item) -> Result<Item, String> {
    let mut conn = db::get().lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO items (company_id, sku, name, unit, description, category_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![payload.company_id, payload.sku, payload.name, payload.unit, payload.description, payload.category_id],
    ).map_err(|e| e.to_string())?;

    let item_id = tx.last_insert_rowid();

    for p in payload.prices {
        tx.execute(
            "INSERT INTO item_prices (item_id, label, price) VALUES (?1, ?2, ?3)",
            params![item_id, p.label, p.price],
        ).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    _get_item(&conn, item_id)
}

#[command]
pub fn update_item(id: i64, payload: Item) -> Result<Item, String> {
    let mut conn = db::get().lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE items SET sku = ?1, name = ?2, unit = ?3, description = ?4, category_id = ?5 WHERE id = ?6",
        params![payload.sku, payload.name, payload.unit, payload.description, payload.category_id, id],
    ).map_err(|e| e.to_string())?;

    // Simple strategy: delete all prices and re-insert
    tx.execute("DELETE FROM item_prices WHERE item_id = ?1", params![id]).map_err(|e| e.to_string())?;

    for p in payload.prices {
        tx.execute(
            "INSERT INTO item_prices (item_id, label, price) VALUES (?1, ?2, ?3)",
            params![id, p.label, p.price],
        ).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    _get_item(&conn, id)
}

#[command]
pub fn delete_item(id: i64) -> Result<(), String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM items WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}


