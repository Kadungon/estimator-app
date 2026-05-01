use once_cell::sync::OnceCell;
use rusqlite::{Connection, Result};
use std::sync::Mutex;
use tauri::Manager;

static DB: OnceCell<Mutex<Connection>> = OnceCell::new();

pub fn init(path: &str) -> Result<()> {
    let conn = Connection::open(path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    run_migrations(&conn)?;
    DB.set(Mutex::new(conn))
        .map_err(|_| rusqlite::Error::InvalidQuery)?;
    Ok(())
}

pub fn get() -> &'static Mutex<Connection> {
    DB.get().expect("Database not initialised")
}

pub fn resolve_db_path(_app: &tauri::AppHandle) -> std::path::PathBuf {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()));
    
    if let Some(ref dir) = exe_dir {
        // 1. Check for db_path.json in exe_dir (Custom Path Override)
        let config_path = dir.join("db_path.json");
        if config_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&config_path) {
                if let Ok(path_str) = serde_json::from_str::<String>(&content) {
                    let mut path = std::path::PathBuf::from(&path_str);
                    
                    // Resolve relative paths against the current executable directory
                    if path.is_relative() {
                        path = dir.join(path);
                    }
                    
                    // Ensure the parent directory exists
                    if let Some(parent) = path.parent() {
                        if !parent.exists() {
                            let _ = std::fs::create_dir_all(parent);
                        }
                    }
                    
                    return path;
                }
            }
        }
        
        // 2. Always use the directory of the executable
        return dir.join("estima.db");
    }

    // 3. Fallback to current working directory if executable path cannot be determined
    std::path::PathBuf::from("estima.db")
}

pub fn get_db_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    Ok(resolve_db_path(app))
}

fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        INSERT OR IGNORE INTO settings (key, value) VALUES
            ('shop_name',       'Estima'),
            ('shop_address',    ''),
            ('shop_phone',      ''),
            ('shop_email',      ''),
            ('pdf_layout',      'A4'),
            ('theme',           'dark'),
            ('confirm_save',    'true'),
            ('estimates_dir',   '');

        CREATE TABLE IF NOT EXISTS companies (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL,
            address    TEXT,
            phone      TEXT,
            email      TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        INSERT OR IGNORE INTO companies (id, name) VALUES (1, 'Default Company');

        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            username    TEXT NOT NULL UNIQUE,
            password    TEXT NOT NULL,
            role        TEXT NOT NULL DEFAULT 'user',
            created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS user_companies (
            user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, company_id)
        );

        INSERT OR IGNORE INTO users (id, username, password) VALUES (1, 'admin', 'admin');
        INSERT OR IGNORE INTO user_companies (user_id, company_id) VALUES (1, 1);

        CREATE TABLE IF NOT EXISTS categories (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id  INTEGER NOT NULL DEFAULT 1 REFERENCES companies(id) ON DELETE CASCADE,
            name        TEXT NOT NULL,
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(company_id, name)
        );

        CREATE TABLE IF NOT EXISTS items (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id  INTEGER NOT NULL DEFAULT 1 REFERENCES companies(id) ON DELETE CASCADE,
            sku         TEXT,
            name        TEXT NOT NULL,
            unit        TEXT DEFAULT 'Pcs',
            description TEXT,
            category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(company_id, sku)
        );

        CREATE TABLE IF NOT EXISTS item_prices (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
            label   TEXT NOT NULL,
            price   REAL NOT NULL,
            UNIQUE(item_id, label)
        );

        CREATE TABLE IF NOT EXISTS estimates (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id  INTEGER NOT NULL DEFAULT 1 REFERENCES companies(id) ON DELETE CASCADE,
            est_number  TEXT NOT NULL UNIQUE,
            customer    TEXT,
            notes       TEXT,
            subtotal    REAL NOT NULL DEFAULT 0,
            discount    REAL NOT NULL DEFAULT 0,
            total       REAL NOT NULL DEFAULT 0,
            pdf_path    TEXT,
            created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS estimate_items (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            estimate_id INTEGER NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
            item_id     INTEGER REFERENCES items(id),
            name        TEXT NOT NULL,
            unit        TEXT,
            price_label TEXT,
            unit_price  REAL NOT NULL,
            quantity    REAL NOT NULL DEFAULT 1,
            line_total  REAL NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
        CREATE INDEX IF NOT EXISTS idx_items_sku  ON items(sku);
        CREATE INDEX IF NOT EXISTS idx_estimates_created ON estimates(created_at DESC);
    ")?;

    // Migrations for existing tables (adding missing columns)
    let _ = conn.execute("ALTER TABLE items ADD COLUMN unit TEXT DEFAULT 'Pcs'", []);
    let _ = conn.execute("ALTER TABLE items ADD COLUMN company_id INTEGER NOT NULL DEFAULT 1", []);
    let _ = conn.execute("ALTER TABLE estimate_items ADD COLUMN unit TEXT", []);
    let _ = conn.execute("ALTER TABLE estimates ADD COLUMN company_id INTEGER NOT NULL DEFAULT 1", []);
    let _ = conn.execute("ALTER TABLE categories ADD COLUMN company_id INTEGER NOT NULL DEFAULT 1", []);
    let _ = conn.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'", []);
    let _ = conn.execute("UPDATE users SET role = 'admin' WHERE id = 1", []);
    Ok(())
}

