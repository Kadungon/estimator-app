import { useState } from "react";
import toast from "react-hot-toast";
import { X, Plus, Trash2 } from "lucide-react";
import { createItem, updateItem } from "../../lib/tauri";
import { Item, Category } from "../../types";
import { useAuthStore } from "../../store/authStore";
import CategoryModal from "./CategoryModal";
import NumericInput from "../common/NumericInput";


interface Props {
  item?: Item;
  categories: Category[];
  onSave: () => void;
  onClose: () => void;
}

export default function ItemModal({ item, categories, onSave, onClose }: Props) {
  const [name, setName] = useState(item?.name || "");
  const [sku, setSku] = useState(item?.sku || "");
  const [unit, setUnit] = useState(item?.unit || "Pcs");
  const [categoryId, setCategoryId] = useState<number | undefined>(item?.category_id || undefined);
  const [prices, setPrices] = useState<{ label: string; price: number }[]>(
    item?.prices.map(p => ({ label: p.label, price: p.price })) || [
      { label: "Retail", price: 0 },
      { label: "Wholesale", price: 0 }
    ]
  );
  const [loading, setLoading] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);

  const companyId = useAuthStore(state => state.company?.id);

  const addPrice = () => setPrices([...prices, { label: "", price: 0 }]);
  const removePrice = (idx: number) => setPrices(prices.filter((_, i) => i !== idx));
  const updatePrice = (idx: number, key: "label" | "price", val: any) => {
    const next = [...prices];
    next[idx] = { ...next[idx], [key]: val };
    setPrices(next);
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Name is required");
    if (!companyId) return;
    setLoading(true);
    try {
      const payload = {
        company_id: companyId,
        name,
        sku: sku || null,
        unit: unit || "Pcs",
        description: null,
        category_id: categoryId || null,
        prices: prices.filter(p => p.label.trim() !== "")
      };
      if (item) {
        await updateItem(item.id, payload);
      } else {
        await createItem(payload);
      }
      toast.success(item ? "Item updated" : "Item created");
      onSave();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{item ? "Edit Item" : "New Master Item"}</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="input-group">
            <label className="input-label">Item Name *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Samsung 25W Adapter" autoFocus />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr 1.2fr", gap: 12 }}>
            <div className="input-group">
              <label className="input-label">SKU / Barcode</label>
              <input className="input" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Optional" />
            </div>
            <div className="input-group">
              <label className="input-label">Unit</label>
              <input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Pcs" />
            </div>
            <div className="input-group">
              <label className="input-label">Category</label>
              <div style={{ display: "flex", gap: 6 }}>
                <select className="select" value={categoryId || ""} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)} style={{ flex: 1 }}>
                  <option value="">None</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="btn btn-icon btn-ghost" onClick={() => setShowCatModal(true)} title="Add Category" type="button">
                   <Plus size={16} />
                </button>
              </div>
            </div>
          </div>


          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <label className="input-label" style={{ marginBottom: 0 }}>Price Points</label>
              <button className="btn btn-ghost btn-sm" onClick={addPrice}><Plus size={12} /> Add Point</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto", paddingRight: 4 }}>
              {prices.map((p, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input 
                    className="input" 
                    style={{ flex: 1.5 }} 
                    placeholder="Label (e.g. Retail)" 
                    value={p.label} 
                    onChange={(e) => updatePrice(idx, "label", e.target.value)} 
                  />
                  <NumericInput 
                    value={p.price} 
                    onChange={(val) => updatePrice(idx, "price", val)} 
                    style={{ flex: 1 }}
                  />

                  <button className="btn btn-icon btn-danger btn-sm" onClick={() => removePrice(idx)} disabled={prices.length <= 1}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 24 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? <div className="spinner" /> : (item ? "Save Changes" : "Create Item")}
          </button>
        </div>

        {showCatModal && (
          <CategoryModal 
            onSave={() => { setShowCatModal(false); onSave(); }} 
            onClose={() => setShowCatModal(false)} 
          />
        )}
      </div>
    </div>
  );
}
