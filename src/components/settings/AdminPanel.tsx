import { useState, useEffect } from "react";
import { Users, Building, Plus, Trash2, Database, RefreshCw, Download, Link, Unlink, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { 
  getCompanies, createCompany, getAllUsers, createUser, 
  backupDb, resetData, linkUserToCompany, unlinkUserFromCompany,
  getDbInfo, setDbPath
} from "../../lib/tauri";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { useAuthStore } from "../../store/authStore";
import ConfirmModal from "../common/ConfirmModal";

export default function AdminPanel() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const currentCompany = useAuthStore(state => state.company);

  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: "", address: "", phone: "", email: "" });

  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "" });

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [dbPath, setDbPathState] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [c, u, path] = await Promise.all([getCompanies(), getAllUsers(), getDbInfo()]);
      setCompanies(c);
      setUsers(u);
      setDbPathState(path);
    } catch (e) {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = async () => {
    if (!newCompany.name) return;
    try {
      await createCompany(newCompany.name, newCompany.address, newCompany.phone, newCompany.email);
      toast.success("Company created");
      setShowAddCompany(false);
      setNewCompany({ name: "", address: "", phone: "", email: "" });
      loadData();
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) return;
    try {
      // Default to company 1 if any, will be linked after
      await createUser(1, newUser.username, newUser.password);
      toast.success("User account created");
      setShowAddUser(false);
      setNewUser({ username: "", password: "" });
      loadData();
    } catch (e) {
      toast.error(String(e));
    }
  };

  const toggleLink = async (userId: number, companyId: number, isLinked: boolean) => {
    try {
      if (isLinked) {
        await unlinkUserFromCompany(userId, companyId);
        toast.success("Company unlinked");
      } else {
        await linkUserToCompany(userId, companyId);
        toast.success("Company linked");
      }
      loadData();
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleBackup = async () => {
    try {
      const path = await backupDb();
      toast.success(`Backup saved to: ${path}`);
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleReset = async () => {
    if (!currentCompany) return;
    try {
      await resetData(currentCompany.id);
      toast.success("All data for this company has been reset");
      setShowResetConfirm(false);
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleSetPath = async () => {
    try {
      const path = await saveDialog({
        title: "Select Database Storage Location",
        defaultPath: "quickestimate.db",
        filters: [{ name: "SQLite Database", extensions: ["db"] }]
      });
      if (path) {
        await setDbPath(path);
        toast.success("Database location updated. Please restart the app for changes to take effect.");
        setDbPathState(path);
      }
    } catch (e) {
      toast.error(String(e));
    }
  };

  if (loading) return <div className="spinner" />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Companies */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Building size={18} style={{ color: "var(--primary)" }} />
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Companies</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAddCompany(true)}>
            <Plus size={14} /> Add Company
          </button>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(c => (
              <tr key={c.id}>
                <td>#{c.id}</td>
                <td><strong>{c.name}</strong></td>
                <td>{c.phone || "—"}</td>
                <td>{c.email || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {showAddCompany && (
          <div style={{ marginTop: 20, padding: 16, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)" }}>
            <h4 style={{ fontSize: 13, marginBottom: 12 }}>Add New Company</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <input className="input" placeholder="Company Name" value={newCompany.name} onChange={e => setNewCompany({...newCompany, name: e.target.value})} />
              <input className="input" placeholder="Phone" value={newCompany.phone} onChange={e => setNewCompany({...newCompany, phone: e.target.value})} />
              <input className="input" placeholder="Email" value={newCompany.email} onChange={e => setNewCompany({...newCompany, email: e.target.value})} />
              <input className="input" placeholder="Address" value={newCompany.address} onChange={e => setNewCompany({...newCompany, address: e.target.value})} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={handleAddCompany}>Create</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddCompany(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Users */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={18} style={{ color: "var(--primary)" }} />
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>User Accounts</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAddUser(true)}>
            <Plus size={14} /> Add User
          </button>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Accessible Companies</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{u.username}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>ID: #{u.id}</div>
                </td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'badge-primary' : ''}`} style={{ display: "flex", alignItems: "center", gap: 4, width: "fit-content" }}>
                    {u.role === 'admin' ? <Shield size={10} /> : null}
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {companies.map(c => {
                      const isLinked = u.companies.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          className={`badge ${isLinked ? 'badge-success' : 'badge-ghost'}`}
                          style={{ cursor: u.role === 'admin' ? "default" : "pointer", border: "none", opacity: u.role === 'admin' && !isLinked ? 0.3 : 1 }}
                          onClick={() => u.role !== 'admin' && toggleLink(u.id, c.id, isLinked)}
                          title={u.role === 'admin' ? "Admins have access to all companies" : isLinked ? "Click to unlink" : "Click to link"}
                        >
                          {isLinked ? <Link size={10} style={{ marginRight: 4 }} /> : <Unlink size={10} style={{ marginRight: 4 }} />}
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {showAddUser && (
          <div style={{ marginTop: 20, padding: 16, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)" }}>
            <h4 style={{ fontSize: 13, marginBottom: 12 }}>Create New User Account</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <input className="input" placeholder="Username" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
              <input className="input" type="password" placeholder="Password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
              New users are created with the 'user' role. You can link them to companies after creation.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={handleAddUser}>Create User</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddUser(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Database Maintenance */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Database size={18} style={{ color: "var(--primary)" }} />
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Database & Storage</h3>
        </div>

        <div className="input-group" style={{ marginBottom: 20 }}>
          <label className="input-label">Current Database Location</label>
          <div style={{ display: "flex", gap: 10 }}>
            <div className="input" style={{ flex: 1, height: "auto", minHeight: 38, padding: "8px 12px", background: "var(--bg)", fontSize: 12, wordBreak: "break-all" }}>
              {dbPath}
            </div>
            <button className="btn btn-ghost" onClick={handleSetPath}>Change</button>
          </div>
          <p style={{ fontSize: 10, color: "var(--accent)", marginTop: 6, fontWeight: 600 }}>
            TIP: Move the .db file manually before restarting if you want to keep existing data.
          </p>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={handleBackup}>
            <Download size={16} /> Backup Database
          </button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => setShowResetConfirm(true)}>
            <RefreshCw size={16} /> Reset Company Data
          </button>
        </div>
        <p style={{ marginTop: 12, fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
          Backup creates a timestamped copy of your database file. 
          Resetting data will delete all items, categories, and estimates for the active company.
        </p>
      </div>

      {showResetConfirm && (
        <ConfirmModal 
          title="Reset All Data?"
          message="This will permanently delete all items, categories, and estimates for your active company. Users and company profiles will NOT be deleted. This action cannot be undone."
          confirmLabel="Yes, Reset Data"
          variant="danger"
          onConfirm={handleReset}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
    </div>
  );
}
