import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  onAdd: (name: string, price: number, unit: string) => void;
  onClose: () => void;
}

export default function QuickAddModal({ onAdd, onClose }: Props) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("Pcs");

  const submit = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), parseFloat(price) || 0, unit || "Pcs");
    onClose();
  };


  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") submit();
    if (e.key === "Escape") onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} onKeyDown={handleKey}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>⚡ Quick Add Item</h2>
          <button className="btn btn-icon btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 18 }}>
          Add this item to the bill. You can save it to the database after.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="input-group">
            <label className="input-label">Item Name *</label>
            <input
              id="quick-add-name"
              className="input"
              placeholder="e.g. Custom Product"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="input-group">
              <label className="input-label">Price (Rs.)</label>
              <input
                id="quick-add-price"
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Unit</label>
              <input
                className="input"
                placeholder="Pcs"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>

        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            id="quick-add-submit"
            className="btn btn-primary"
            onClick={submit}
            disabled={!name.trim()}
          >
            Add to Bill
          </button>
        </div>
      </div>
    </div>
  );
}
