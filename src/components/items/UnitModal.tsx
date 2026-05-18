import { useState } from "react";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { createUnit } from "../../lib/tauri";
import { useAuthStore } from "../../store/authStore";

interface Props {
  onSave: () => void;
  onClose: () => void;
}

export default function UnitModal({ onSave, onClose }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const companyId = useAuthStore(state => state.company?.id);

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Unit name is required");
    if (!companyId) return;

    setLoading(true);
    try {
      await createUnit(companyId, name);
      toast.success("Unit created");
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
          <h2 className="modal-title" style={{ margin: 0 }}>New Unit</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="input-group">
          <label className="input-label">Unit Name (e.g. Kgs, Ltrs, Box)</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Kgs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
          />
        </div>

        <div className="modal-actions" style={{ marginTop: 24 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Create Unit"}
          </button>
        </div>
      </div>
    </div>
  );
}
