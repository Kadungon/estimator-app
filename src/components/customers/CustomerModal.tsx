import { useState } from "react";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { createCustomer } from "../../lib/tauri";
import { useAuthStore } from "../../store/authStore";

interface Props {
  onSave: () => void;
  onClose: () => void;
}

export default function CustomerModal({ onSave, onClose }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const companyId = useAuthStore(state => state.company?.id);

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Customer name is required");
    if (!companyId) return;

    setLoading(true);
    try {
      await createCustomer(companyId, name.trim(), phone.trim(), address.trim());
      toast.success("Customer created");
      onSave();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>New Customer</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="input-group">
            <label className="input-label">Name *</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              autoFocus
            />
          </div>
          
          <div className="input-group">
            <label className="input-label">Phone</label>
            <input
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Address</label>
            <textarea
              className="input"
              style={{ resize: "vertical", minHeight: 60 }}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Customer address"
            />
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 24 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Create Customer"}
          </button>
        </div>
      </div>
    </div>
  );
}
