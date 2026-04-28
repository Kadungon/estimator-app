import { Trash2 } from "lucide-react";
import { useCartStore } from "../../store/cartStore";
import { Item } from "../../types";
import NumericInput from "../common/NumericInput";


interface Props {
  onSelectPriceLabel: (tempId: string, item: Item | null, currentLabel: string | null, currentPrice: number) => void;
}

export default function CartTable({ onSelectPriceLabel }: Props) {
  const { items, removeItem, updateQty, updatePrice } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="empty-state" style={{ padding: "40px 20px" }}>
        <ReceiptIcon />
        <h3>Cart is empty</h3>
        <p style={{ fontSize: 13 }}>Search for items above or use Quick Add</p>
      </div>
    );
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th style={{ width: 28 }}>#</th>
          <th>Item</th>
          <th style={{ width: 120 }}>Price Type</th>
          <th style={{ width: 100, textAlign: "right" }}>Unit Price</th>
          <th style={{ width: 72, textAlign: "right" }}>Qty</th>
          <th style={{ width: 100, textAlign: "right" }}>Total</th>
          <th style={{ width: 36 }}></th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => {
          const lineTotal = item.unit_price * item.quantity;
          return (
            <tr key={item.tempId}>
              <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{idx + 1}</td>
              <td>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{item.name}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                  <span className="badge badge-primary" style={{ fontSize: 10 }}>{item.unit || "Pcs"}</span>
                </div>
              </td>
              <td>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 12, padding: "3px 8px" }}
                  onClick={() => onSelectPriceLabel(item.tempId, null, item.price_label, item.unit_price)}
                  title="Change price type"
                >
                  {item.price_label || "Custom"}
                </button>
              </td>
              <td>
                <NumericInput
                  value={item.unit_price}
                  step={0.01}
                  min={0}
                  onChange={(val) => updatePrice(item.tempId, val)}
                  style={{ width: "120px" }}
                />
              </td>
              <td>
                <NumericInput
                  value={item.quantity}
                  step={1}
                  min={1}
                  onChange={(val) => updateQty(item.tempId, val)}
                  style={{ width: "100px" }}
                />
              </td>

              <td style={{ textAlign: "right", fontWeight: 600, fontSize: 13.5 }}>
                Rs.{lineTotal.toFixed(2)}
              </td>

              <td>
                <button
                  className="btn btn-icon btn-danger btn-sm"
                  onClick={() => removeItem(item.tempId)}
                  title="Remove"
                >
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ReceiptIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
