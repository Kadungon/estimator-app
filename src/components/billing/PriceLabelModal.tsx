import { X } from "lucide-react";

interface Props {
  prices: { label: string; price: number }[];
  onSelect: (label: string, price: number) => void;
  onClose: () => void;
}

export default function PriceLabelModal({ prices, onSelect, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Select Price Type</h2>
          <button className="btn btn-icon btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {prices.map((p) => (
            <button
              key={p.label}
              className="btn btn-ghost"
              style={{ justifyContent: "space-between", padding: "12px 16px" }}
              onClick={() => onSelect(p.label, p.price)}
            >
              <span>{p.label}</span>
              <span style={{ fontWeight: 700, color: "var(--primary)" }}>₹{p.price.toFixed(2)}</span>
            </button>
          ))}
          
          <button 
            className="btn btn-ghost" 
            style={{ marginTop: 8, color: "var(--text-muted)", fontSize: 12 }}
            onClick={() => onSelect("Custom", 0)}
          >
            Custom Price
          </button>
        </div>
      </div>
    </div>
  );
}
