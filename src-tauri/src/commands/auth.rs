use crate::{db, models::{User, Company}};
use tauri::command;

#[command]
pub fn login(username: String, password: String) -> Result<(User, Vec<Company>), String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    
    let mut user = conn.query_row(
        "SELECT id, username, role FROM users WHERE username = ?1 AND password = ?2",
        [username, password],
        |row| Ok(User {
            id: row.get(0)?,
            username: row.get(1)?,
            role: row.get(2)?,
            companies: vec![],
        })
    ).map_err(|_| "Invalid username or password".to_string())?;

    // Fetch user's company IDs
    {
        let mut c_stmt = conn.prepare("SELECT company_id FROM user_companies WHERE user_id = ?1").map_err(|e| e.to_string())?;
        let c_rows = c_stmt.query_map([user.id], |c_row| c_row.get(0)).map_err(|e| e.to_string())?;
        for cr in c_rows {
            user.companies.push(cr.map_err(|e| e.to_string())?);
        }
    }
    
    let companies = if user.role == "admin" {
        // Admin sees everything
        let mut stmt = conn.prepare("SELECT id, name, address, phone, email FROM companies").map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            Ok(Company {
                id: row.get(0)?,
                name: row.get(1)?,
                address: row.get(2)?,
                phone: row.get(3)?,
                email: row.get(4)?,
            })
        }).map_err(|e| e.to_string())?;
        
        let mut list = Vec::new();
        for r in rows { list.push(r.map_err(|e| e.to_string())?); }
        list
    } else {
        // User sees only linked
        let mut stmt = conn.prepare("
            SELECT c.id, c.name, c.address, c.phone, c.email 
            FROM companies c
            JOIN user_companies uc ON c.id = uc.company_id
            WHERE uc.user_id = ?1
        ").map_err(|e| e.to_string())?;
        
        let rows = stmt.query_map([user.id], |row| {
            Ok(Company {
                id: row.get(0)?,
                name: row.get(1)?,
                address: row.get(2)?,
                phone: row.get(3)?,
                email: row.get(4)?,
            })
        }).map_err(|e| e.to_string())?;
        
        let mut list = Vec::new();
        for r in rows { list.push(r.map_err(|e| e.to_string())?); }
        list
    };
    
    Ok((user, companies))
}

#[command]
pub fn get_companies() -> Result<Vec<Company>, String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, name, address, phone, email FROM companies").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(Company {
            id: row.get(0)?,
            name: row.get(1)?,
            address: row.get(2)?,
            phone: row.get(3)?,
            email: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut companies = Vec::new();
    for row in rows {
        companies.push(row.map_err(|e| e.to_string())?);
    }
    Ok(companies)
}

#[command]
pub fn change_password(user_id: i64, old_pass: String, new_pass: String) -> Result<(), String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    
    // Verify old password
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM users WHERE id = ?1 AND password = ?2",
        [user_id.to_string(), old_pass],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;
    
    if count == 0 {
        return Err("Incorrect current password".into());
    }
    
    conn.execute(
        "UPDATE users SET password = ?1 WHERE id = ?2",
        [new_pass, user_id.to_string()]
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[command]
pub fn create_company(name: String, address: Option<String>, phone: Option<String>, email: Option<String>) -> Result<Company, String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO companies (name, address, phone, email) VALUES (?1, ?2, ?3, ?4)",
        (name.clone(), address.clone(), phone.clone(), email.clone())
    ).map_err(|e| e.to_string())?;
    
    let id = conn.last_insert_rowid();
    Ok(Company { id, name, address, phone, email })
}

#[command]
pub fn create_user(company_id: i64, username: String, password: String) -> Result<(), String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    
    // Check if username exists
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM users WHERE username = ?1)",
        [username.clone()],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;
    
    if exists {
        return Err("Username already exists".into());
    }
    
    conn.execute(
        "INSERT INTO users (username, password, role) VALUES (?1, ?2, 'user')",
        (username, password),
    ).map_err(|e| e.to_string())?;
    
    let user_id: i64 = conn.last_insert_rowid();
    conn.execute(
        "INSERT INTO user_companies (user_id, company_id) VALUES (?1, ?2)",
        (user_id, company_id),
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[command]
pub fn get_all_users() -> Result<Vec<User>, String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, username, role FROM users").map_err(|e| e.to_string())?;
    
    let user_rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
        ))
    }).map_err(|e| e.to_string())?;
    
    let mut users = Vec::new();
    for row_res in user_rows {
        let (id, username, role) = row_res.map_err(|e| e.to_string())?;
        
        // Fetch linked companies
        let mut companies = Vec::new();
        {
            let mut c_stmt = conn.prepare("SELECT company_id FROM user_companies WHERE user_id = ?1").map_err(|e| e.to_string())?;
            let c_rows = c_stmt.query_map([id], |c_row| c_row.get(0)).map_err(|e| e.to_string())?;
            for cr in c_rows {
                companies.push(cr.map_err(|e| e.to_string())?);
            }
        }

        users.push(User {
            id,
            username,
            role,
            companies,
        });
    }
    
    Ok(users)
}

#[command]
pub fn link_user_to_company(user_id: i64, company_id: i64) -> Result<(), String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR IGNORE INTO user_companies (user_id, company_id) VALUES (?1, ?2)",
        (user_id, company_id)
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub fn unlink_user_from_company(user_id: i64, company_id: i64) -> Result<(), String> {
    let conn = db::get().lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM user_companies WHERE user_id = ?1 AND company_id = ?2",
        (user_id, company_id)
    ).map_err(|e| e.to_string())?;
    Ok(())
}
