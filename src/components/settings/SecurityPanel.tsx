import { useState } from "react";
import { Lock, ShieldCheck, Key } from "lucide-react";
import toast from "react-hot-toast";
import { changePassword } from "../../lib/tauri";
import { useAuthStore } from "../../store/authStore";

export default function SecurityPanel() {
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);
  const user = useAuthStore(state => state.user);

  const handlePasswordChange = async () => {
    if (!user) return;
    if (newPass !== confirmPass) {
      return toast.error("New passwords do not match");
    }
    if (newPass.length < 4) {
      return toast.error("Password must be at least 4 characters");
    }

    setLoading(true);
    try {
      await changePassword(user.id, oldPass, newPass);
      toast.success("Password changed successfully");
      setOldPass("");
      setNewPass("");
      setConfirmPass("");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-grid">
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <ShieldCheck size={18} style={{ color: "var(--primary)" }} />
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Security & Credentials</h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="input-group">
            <label className="input-label"><Lock size={12} /> Current Password</label>
            <input 
              type="password" 
              className="input" 
              value={oldPass} 
              onChange={e => setOldPass(e.target.value)} 
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="input-group">
              <label className="input-label"><Key size={12} /> New Password</label>
              <input 
                type="password" 
                className="input" 
                value={newPass} 
                onChange={e => setNewPass(e.target.value)} 
              />
            </div>
            <div className="input-group">
              <label className="input-label"><Key size={12} /> Confirm Password</label>
              <input 
                type="password" 
                className="input" 
                value={confirmPass} 
                onChange={e => setConfirmPass(e.target.value)} 
              />
            </div>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ marginTop: 8 }}
            onClick={handlePasswordChange}
            disabled={loading || !oldPass || !newPass}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Lock size={18} style={{ color: "var(--primary)" }} />
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Privacy Info</h3>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
          Your credentials are stored locally in the application database. 
          Make sure to keep your password secure as it cannot be recovered if lost without a manual database edit.
        </p>
      </div>
    </div>
  );
}
