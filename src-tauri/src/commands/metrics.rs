use crate::db::get;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct DashboardKPIs {
    pub total_revenue: f64,
    pub total_estimates: i64,
    pub average_order_value: f64,
}

#[derive(Serialize)]
pub struct RevenueTrend {
    pub date: String,
    pub revenue: f64,
}

#[derive(Serialize)]
pub struct TopItem {
    pub name: String,
    pub quantity: f64,
    pub revenue: f64,
}

#[tauri::command]
pub fn get_dashboard_kpis(company_id: i64) -> Result<DashboardKPIs, String> {
    let db = get().lock().unwrap();
    let mut stmt = db.prepare("
        SELECT 
            COALESCE(SUM(total), 0) as total_revenue,
            COUNT(id) as total_estimates
        FROM estimates 
        WHERE company_id = ?
    ").map_err(|e| e.to_string())?;

    let mut total_revenue: f64 = 0.0;
    let mut total_estimates: i64 = 0;

    let mut rows = stmt.query([company_id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        total_revenue = row.get(0).unwrap_or(0.0);
        total_estimates = row.get(1).unwrap_or(0);
    }

    let average_order_value = if total_estimates > 0 {
        total_revenue / total_estimates as f64
    } else {
        0.0
    };

    Ok(DashboardKPIs {
        total_revenue,
        total_estimates,
        average_order_value,
    })
}

#[tauri::command]
pub fn get_revenue_trends(company_id: i64, days: i64) -> Result<Vec<RevenueTrend>, String> {
    let db = get().lock().unwrap();
    
    let query = "
        SELECT DATE(created_at) as date, COALESCE(SUM(total), 0) as revenue
        FROM estimates
        WHERE company_id = ? AND created_at >= date('now', ?)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    ";
    
    let mut stmt = db.prepare(query).map_err(|e| e.to_string())?;
    
    let modifier = format!("-{} days", days);
    let rows = stmt.query_map(rusqlite::params![company_id, modifier], |row| {
        Ok(RevenueTrend {
            date: row.get(0)?,
            revenue: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut trends = Vec::new();
    for row in rows {
        if let Ok(trend) = row {
            trends.push(trend);
        }
    }

    Ok(trends)
}

#[tauri::command]
pub fn get_top_items(company_id: i64, limit: i64) -> Result<Vec<TopItem>, String> {
    let db = get().lock().unwrap();
    let query = "
        SELECT ei.name, COALESCE(SUM(ei.quantity), 0) as quantity, COALESCE(SUM(ei.line_total), 0) as revenue
        FROM estimate_items ei
        JOIN estimates e ON ei.estimate_id = e.id
        WHERE e.company_id = ?
        GROUP BY ei.name
        ORDER BY revenue DESC
        LIMIT ?
    ";
    
    let mut stmt = db.prepare(query).map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map(rusqlite::params![company_id, limit], |row| {
        Ok(TopItem {
            name: row.get(0)?,
            quantity: row.get(1)?,
            revenue: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        if let Ok(item) = row {
            items.push(item);
        }
    }

    Ok(items)
}
