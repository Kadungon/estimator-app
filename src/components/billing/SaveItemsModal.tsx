import { useState } from "react";
import { Database, AlertCircle } from "lucide-react";

interface Props {
  items: string[];
  onConfirm: (saveToDb: string[]) => void;
  onSkip: () => void;
  onClose: () => void;
}

export default function SaveItemsModal({ items, onConfirm, onSkip, onClose }: Props) {
  const [selected, setSelected] = useState<string[]>(items);

  const toggle = (name: string) => {
    setSelected(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, color: "var(--accent)" }}>
          <Database size={24} />
          <h2 className="modal-title" style={{ margin: 0 }}>New Items Detected</h2>
        </div>

        <div style={{ display: "flex", gap: 10, padding: 12, background: "var(--accent-dim)", borderRadius: 8, marginBottom: 20 }}>
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            The following items are not in your Master Database. Would you like to save them for future use?
          </p>
        </div>

        <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 20 }}>
          {items.map(name => (
            <label key={name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)" }}>
              <input 
                type="checkbox" 
                checked={selected.includes(name)} 
                onChange={() => toggle(name)}
                style={{ width: 16, height: 16, accentColor: "var(--primary)" }}
              />
              <span style={{ fontSize: 14, fontWeight: 500 }}>{name}</span>
            </label>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onSkip}>Don't Save to DB</button>
          <button className="btn btn-primary" onClick={() => onConfirm(selected)}>
            {selected.length > 0 ? `Save ${selected.length} Items & Finish` : "Finish Without Saving"}
          </button>
        </div>
      </div>
    </div>
  );
}
