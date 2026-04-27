import { useState } from "react";
import toast from "react-hot-toast";
import { X, Tag } from "lucide-react";
import { createCategory } from "../../lib/tauri";
import { useAuthStore } from "../../store/authStore";

interface Props {
  onSave: () => void;
  onClose: () => void;
}

export default function CategoryModal({ onSave, onClose }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const companyId = useAuthStore(state => state.company?.id);

  const handleSave = async () => {
    if (!name.trim() || !companyId) return;
    setLoading(true);
    try {
      await createCategory(companyId, name.trim());
      toast.success("Category created");
      onSave();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>New Category</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="input-group">
          <label className="input-label">Category Name</label>
          <div style={{ position: "relative" }}>
             <Tag size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
             <input 
              className="input" 
              style={{ paddingLeft: 32 }}
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Chargers, Screens..." 
              autoFocus 
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 24 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading || !name.trim()}>
            {loading ? <div className="spinner" /> : "Save Category"}
          </button>
        </div>
      </div>
    </div>
  );
}
