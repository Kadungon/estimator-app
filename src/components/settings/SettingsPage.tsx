import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { 
  Save, Store, MapPin, Phone, Mail, FileText, 
  Monitor, Check, Shield, Settings as SettingsIcon, Users 
} from "lucide-react";
import { getSettings, updateSettings } from "../../lib/tauri";
import { Settings } from "../../types";
import SecurityPanel from "./SecurityPanel";
import AdminPanel from "./AdminPanel";
import { useAuthStore } from "../../store/authStore";

interface Props {
  onThemeChange: (theme: "dark" | "light") => void;
}

type Tab = "general" | "security" | "admin";

export default function SettingsPage({ onThemeChange }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then(s => {
      setSettings(s as unknown as Settings);
      setLoading(false);
    });
  }, []);

  const handleUpdate = (key: keyof Settings, value: string) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateSettings(settings as any);
      onThemeChange(settings.theme as "dark" | "light");
      toast.success("Settings saved successfully");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return <div className="empty-state"><div className="spinner" /></div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <SettingsIcon size={20} style={{ color: "var(--primary)" }} />
          <span className="page-title">Settings & Administration</span>
        </div>
        <div style={{ flex: 1 }} />
        {activeTab === "general" && (
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <div className="spinner" /> : <><Save size={16} /> Save Changes</>}
          </button>
        )}
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 24px", gap: 24, background: "var(--surface)" }}>
        <button 
          onClick={() => setActiveTab("general")}
          style={{ 
            padding: "14px 4px", fontSize: 13, fontWeight: 600, background: "none", border: "none", cursor: "pointer",
            color: activeTab === "general" ? "var(--primary)" : "var(--text-muted)",
            borderBottom: activeTab === "general" ? "2px solid var(--primary)" : "2px solid transparent",
            transition: "all 0.2s"
          }}
        >
          General
        </button>
        <button 
          onClick={() => setActiveTab("security")}
          style={{ 
            padding: "14px 4px", fontSize: 13, fontWeight: 600, background: "none", border: "none", cursor: "pointer",
            color: activeTab === "security" ? "var(--primary)" : "var(--text-muted)",
            borderBottom: activeTab === "security" ? "2px solid var(--primary)" : "2px solid transparent",
            transition: "all 0.2s"
          }}
        >
          Security
        </button>
        {useAuthStore.getState().isAdmin() && (
          <button 
            onClick={() => setActiveTab("admin")}
            style={{ 
              padding: "14px 4px", fontSize: 13, fontWeight: 600, background: "none", border: "none", cursor: "pointer",
              color: activeTab === "admin" ? "var(--primary)" : "var(--text-muted)",
              borderBottom: activeTab === "admin" ? "2px solid var(--primary)" : "2px solid transparent",
              transition: "all 0.2s"
            }}
          >
            Admin & Data
          </button>
        )}
      </div>

      <div className="page-content" style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          
          {activeTab === "general" && (
            <div className="settings-grid">
              {/* Shop Information */}
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <Store size={18} style={{ color: "var(--primary)" }} />
                  <h3 style={{ fontSize: 15, fontWeight: 700 }}>Shop Information</h3>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="input-group">
                    <label className="input-label">Shop Name</label>
                    <input className="input" value={settings.shop_name} onChange={e => handleUpdate("shop_name", e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Shop Address</label>
                    <textarea className="input" style={{ minHeight: 60, resize: "none" }} value={settings.shop_address} onChange={e => handleUpdate("shop_address", e.target.value)} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="input-group">
                      <label className="input-label">Phone No.</label>
                      <input className="input" value={settings.shop_phone} onChange={e => handleUpdate("shop_phone", e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Email</label>
                      <input className="input" value={settings.shop_email} onChange={e => handleUpdate("shop_email", e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <Monitor size={18} style={{ color: "var(--primary)" }} />
                  <h3 style={{ fontSize: 15, fontWeight: 700 }}>App Preferences</h3>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                   <div className="input-group">
                    <label className="input-label">UI Theme</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button 
                        className={`btn ${settings.theme === "dark" ? "btn-primary" : "btn-ghost"}`} 
                        style={{ flex: 1 }}
                        onClick={() => handleUpdate("theme", "dark")}
                      >
                        Dark Mode {settings.theme === "dark" && <Check size={14} />}
                      </button>
                      <button 
                        className={`btn ${settings.theme === "light" ? "btn-primary" : "btn-ghost"}`} 
                        style={{ flex: 1 }}
                        onClick={() => handleUpdate("theme", "light")}
                      >
                        Light Mode {settings.theme === "light" && <Check size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label">PDF Page Layout</label>
                    <select className="select" value={settings.pdf_layout} onChange={e => handleUpdate("pdf_layout", e.target.value)}>
                      <option value="A4">A4 (Standard)</option>
                      <option value="A5">A5 (Half-page)</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <input 
                        type="checkbox" 
                        checked={settings.confirm_save === "true"} 
                        onChange={e => handleUpdate("confirm_save", e.target.checked ? "true" : "false")}
                        style={{ width: 18, height: 18, accentColor: "var(--primary)" }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Show confirmation before saving</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && <SecurityPanel />}
          {activeTab === "admin" && <AdminPanel />}

          <div style={{ marginTop: 32, padding: 20, borderTop: "1px solid var(--border)", textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}>
            <p>Estima v0.1.0 • Running on Local Desktop Environment</p>
          </div>
        </div>
      </div>
    </div>
  );
}
