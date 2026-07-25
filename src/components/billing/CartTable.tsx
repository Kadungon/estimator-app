import { Trash2 } from "lucide-react";
import { useCartStore } from "../../store/cartStore";
import { Item } from "../../types";
import NumericInput from "../common/NumericInput";

interface Props {
  onSelectPriceLabel: (tempId: string, item: Item | null, currentLabel: string | null, currentPrice: number) => void;
  entryName: string;
  setEntryName: (v: string) => void;
  entryPrice: number | "";
  setEntryPrice: (v: number | "") => void;
  entryQty: number;
  setEntryQty: (v: number) => void;
  selectedItem: Item | null;
  setSelectedItem: (v: Item | null) => void;
  selectedPriceLabel: string | null;
  setSelectedPriceLabel: (v: string | null) => void;
  selectedUnit: string;
  setSelectedUnit: (v: string) => void;
  searchResults: Item[];
  setSearchResults: (v: Item[]) => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  activeSearchIndex: number;
  setActiveSearchIndex: (v: number) => void;
  selectItem: (item: Item) => void;
  commitAddItem: () => void;
  nameInputRef: React.RefObject<HTMLInputElement | null>;
  priceInputRef: React.RefObject<HTMLInputElement | null>;
  qtyInputRef: React.RefObject<HTMLInputElement | null>;
}

export default function CartTable({
  onSelectPriceLabel,
  entryName,
  setEntryName,
  entryPrice,
  setEntryPrice,
  entryQty,
  setEntryQty,
  selectedItem,
  setSelectedItem,
  selectedPriceLabel,
  setSelectedPriceLabel,
  selectedUnit,
  setSelectedUnit,
  searchResults,
  searchOpen,
  setSearchOpen,
  activeSearchIndex,
  setActiveSearchIndex,
  selectItem,
  commitAddItem,
  nameInputRef,
  priceInputRef,
  qtyInputRef,
}: Props) {
  const { items, removeItem, updateQty, updatePrice } = useCartStore();

  const handleEscapeReset = (e: React.KeyboardEvent) => {
    e.preventDefault();
    setEntryName("");
    setEntryPrice("");
    setEntryQty(1);
    setSelectedItem(null);
    setSelectedPriceLabel("Custom");
    setSearchOpen(false);
    nameInputRef.current?.focus();
    nameInputRef.current?.select();
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchOpen && searchResults.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSearchIndex(Math.min(activeSearchIndex + 1, searchResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSearchIndex(Math.max(activeSearchIndex - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        selectItem(searchResults[activeSearchIndex]);
      } else if (e.key === "Escape") {
        handleEscapeReset(e);
      }
    } else {
      if (e.key === "Enter" || e.key === "Tab") {
        if (entryName.trim()) {
          e.preventDefault();
          if (!selectedItem) {
            setSelectedItem(null);
            setSelectedPriceLabel("Custom");
            setSelectedUnit("Pcs");
            if (entryPrice === "") setEntryPrice(0);
          }
          priceInputRef.current?.focus();
        }
      } else if (e.key === "Escape") {
        handleEscapeReset(e);
      }
    }
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift+Enter or Shift+Tab: move BACKWARD to Name input
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      } else {
        // Enter or Tab: move FORWARD to Qty input
        qtyInputRef.current?.focus();
        qtyInputRef.current?.select();
      }
    } else if (e.key === "Escape") {
      handleEscapeReset(e);
    }
  };

  const handleQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift+Enter or Shift+Tab: move BACKWARD to Price input
        priceInputRef.current?.focus();
        priceInputRef.current?.select();
      } else {
        // Enter or Tab: move FORWARD and commit
        commitAddItem();
      }
    } else if (e.key === "Escape") {
      handleEscapeReset(e);
    }
  };

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th style={{ width: 28 }}>#</th>
          <th>Item Name</th>
          <th style={{ width: 120 }} className="no-print">Price Type</th>
          <th style={{ width: 120, textAlign: "right" }}>Unit Price (Rate)</th>
          <th style={{ width: 100, textAlign: "right" }}>Qty</th>
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
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span className="item-name-cell" style={{ fontWeight: 600, fontSize: 12.5 }}>{item.name}</span>
                  <span className="badge badge-primary" style={{ fontSize: 9, padding: "1px 4px", flexShrink: 0 }}>{item.unit || "Pcs"}</span>
                </div>
              </td>
              <td className="no-print">
                <span className="print-only" style={{ fontSize: "11px", fontWeight: 600 }}>
                  {item.price_label || "Custom"}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 11, padding: "2px 6px", height: 24 }}
                  onClick={() => onSelectPriceLabel(item.tempId, null, item.price_label, item.unit_price)}
                  title="Change price type"
                >
                  {item.price_label || "Custom"}
                </button>
              </td>
              <td>
                <span className="print-only" style={{ fontSize: "12px", fontWeight: 600 }}>
                  Rs.{item.unit_price.toFixed(2)}
                </span>
                <div className="no-print">
                  <NumericInput
                    value={item.unit_price}
                    step={0.01}
                    min={0}
                    onChange={(val) => updatePrice(item.tempId, val)}
                    style={{ width: "120px", height: "30px", fontSize: "12px" }}
                  />
                </div>
              </td>
              <td>
                <span className="print-only" style={{ fontSize: "12px", fontWeight: 600 }}>
                  {item.quantity}
                </span>
                <div className="no-print">
                  <NumericInput
                    value={item.quantity}
                    step={0.01}
                    min={0.001}
                    onChange={(val) => updateQty(item.tempId, val)}
                    style={{ width: "100px", height: "30px", fontSize: "12px" }}
                  />
                </div>
              </td>

              <td style={{ textAlign: "right", fontWeight: 600, fontSize: 12.5 }}>
                Rs.{lineTotal.toFixed(2)}
              </td>

              <td>
                <button
                  className="btn btn-icon btn-danger btn-sm"
                  style={{ height: 26, width: 26 }}
                  onClick={() => removeItem(item.tempId)}
                  title="Remove"
                >
                  <Trash2 size={12} />
                </button>
              </td>
            </tr>
          );
        })}

        {/* Persistent entry row at the very bottom of the table body (Tally ERP billing style) */}
        <tr style={{ background: "var(--surface)" }} className="no-print">
          <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{items.length + 1}</td>
          <td>
            <input
              ref={nameInputRef}
              className="input"
              style={{ fontSize: 12.5, height: 30, paddingLeft: 8 }}
              placeholder="Search or type item name..."
              value={entryName}
              onChange={(e) => setEntryName(e.target.value)}
              onKeyDown={handleNameKeyDown}
              onFocus={(e) => {
                e.stopPropagation();
                setSearchOpen(true);
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSearchOpen(true);
              }}
              autoComplete="off"
            />
          </td>
          <td>
            <div 
              className="badge badge-primary" 
              style={{ 
                fontSize: 10, 
                padding: "4px 8px", 
                width: "100%", 
                textAlign: "center", 
                justifyContent: "center",
                display: "inline-flex" 
              }}
            >
              {selectedPriceLabel || "Custom"}
            </div>
          </td>
          <td>
            <input
              ref={priceInputRef}
              type="number"
              className="input"
              style={{ fontSize: 12.5, height: 30, textAlign: "right" }}
              placeholder="0.00"
              value={entryPrice}
              onChange={(e) => {
                const val = e.target.value;
                setEntryPrice(val === "" ? "" : Number(val));
              }}
              onKeyDown={handlePriceKeyDown}
              min={0}
              step={0.01}
            />
          </td>
          <td>
            <input
              ref={qtyInputRef}
              type="number"
              className="input"
              style={{ fontSize: 12.5, height: 30, textAlign: "right" }}
              placeholder="1"
              value={entryQty}
              onChange={(e) => {
                const val = e.target.value;
                setEntryQty(val === "" ? 1 : Number(val));
              }}
              onKeyDown={handleQtyKeyDown}
              min={0.001}
              step="any"
            />
          </td>
          <td style={{ textAlign: "right", fontWeight: 600, fontSize: 12.5 }}>
            Rs.{((typeof entryPrice === "number" ? entryPrice : 0) * entryQty).toFixed(2)}
          </td>
          <td>
            <button
              className="btn btn-icon btn-primary btn-sm"
              style={{ width: "100%", height: 30 }}
              onClick={commitAddItem}
              title="Add Item (Enter)"
              disabled={!entryName.trim()}
            >
              +
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
