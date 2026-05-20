import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface Props {
  prices: { label: string; price: number }[];
  onSelect: (label: string, price: number) => void;
  onClose: () => void;
}

export default function PriceLabelModal({ prices, onSelect, onClose }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Total options is prices.length + 1 (for Custom Price)
  const totalOptions = prices.length + 1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalOptions);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalOptions) % totalOptions);
      } else if (e.key === "Tab") {
        e.preventDefault();
        if (e.shiftKey) {
          setSelectedIndex((prev) => (prev - 1 + totalOptions) % totalOptions);
        } else {
          setSelectedIndex((prev) => (prev + 1) % totalOptions);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex < prices.length) {
          const p = prices[selectedIndex];
          onSelect(p.label, p.price);
        } else {
          onSelect("Custom", 0);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, prices, totalOptions, onSelect, onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Select Price Type</h2>
          <button className="btn btn-icon btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {prices.map((p, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={p.label}
                className="btn btn-ghost"
                style={{
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: isSelected ? "var(--primary-dim)" : undefined,
                  color: isSelected ? "var(--primary)" : undefined,
                  borderColor: isSelected ? "var(--primary)" : undefined,
                  boxShadow: isSelected ? "0 0 0 2px var(--primary-dim)" : undefined,
                }}
                onClick={() => onSelect(p.label, p.price)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <span>{p.label}</span>
                <span style={{ fontWeight: 700, color: "var(--primary)" }}>₹{p.price.toFixed(2)}</span>
              </button>
            );
          })}
          
          <button 
            className="btn btn-ghost" 
            style={{
              marginTop: 8,
              color: selectedIndex === prices.length ? "var(--primary)" : "var(--text-muted)",
              fontSize: 12,
              background: selectedIndex === prices.length ? "var(--primary-dim)" : undefined,
              borderColor: selectedIndex === prices.length ? "var(--primary)" : undefined,
              boxShadow: selectedIndex === prices.length ? "0 0 0 2px var(--primary-dim)" : undefined,
            }}
            onClick={() => onSelect("Custom", 0)}
            onMouseEnter={() => setSelectedIndex(prices.length)}
          >
            Custom Price
          </button>
        </div>
      </div>
    </div>
  );
}
