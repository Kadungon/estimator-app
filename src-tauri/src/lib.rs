pub mod db;
pub mod models;
pub mod commands;



#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let db_path = db::resolve_db_path(app.handle());
            db::init(db_path.to_str().unwrap())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Settings
            commands::settings::get_settings,
            commands::settings::update_settings,
            // Categories
            commands::categories::get_categories,
            commands::categories::create_category,
            commands::categories::delete_category,
            // Items
            commands::items::get_items,
            commands::items::get_items_count,
            commands::items::get_item,
            commands::items::create_item,
            commands::items::update_item,
            commands::items::delete_item,
            commands::items::bulk_create_items,
            // Estimates
            commands::estimates::get_estimates,
            commands::estimates::get_estimate,
            commands::estimates::save_estimate,
            commands::estimates::delete_estimate,
            commands::estimates::get_next_estimate_number,
            commands::estimates::get_unique_customers,
            // Auth
            commands::auth::login,
            commands::auth::get_companies,
            commands::auth::change_password,
            commands::auth::create_company,
            commands::auth::create_user,
            commands::auth::get_all_users,
            commands::auth::link_user_to_company,
            commands::auth::unlink_user_from_company,
            // Admin
            commands::admin::backup_db,
            commands::admin::reset_data,
            commands::admin::get_db_info,
            commands::admin::set_db_path,
            // PDF
            commands::pdf::generate_pdf,
            // Metrics
            commands::metrics::get_dashboard_kpis,
            commands::metrics::get_revenue_trends,
            commands::metrics::get_top_items,
            // Customers
            commands::customers::get_customers,
            commands::customers::create_customer,
            commands::customers::delete_customer,
            // Units
            commands::units::get_units,
            commands::units::create_unit,
            commands::units::delete_unit,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
