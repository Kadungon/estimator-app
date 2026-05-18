import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { X, Upload, Check, AlertCircle, FileSpreadsheet } from "lucide-react";
import toast from "react-hot-toast";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { bulkCreateItems } from "../../lib/tauri";
import { useAuthStore } from "../../store/authStore";

interface Props {
  onImport: () => void;
  onClose: () => void;
}

export default function ImportModal({ onImport, onClose }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const companyId = useAuthStore(state => state.company?.id);
  const [categories, setCategories] = useState<any[]>([]);

  // Load categories on mount to map them
  useEffect(() => {
    if (companyId) {
      import("../../lib/tauri").then(m => m.getCategories(companyId)).then(setCategories);
    }
  }, [companyId]);

  const handlePickFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Spreadsheets", extensions: ["xlsx", "xls", "csv"] }]
      });

      if (!selected || Array.isArray(selected)) return;
      
      setFileName(selected.split(/[\\/]/).pop() || selected);
      setLoading(true);

      const content = await readFile(selected);
      const workbook = XLSX.read(content, { type: "array" });
      const firstSheet = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]) as any[];

      if (data.length === 0) {
        toast.error("No data found in the selected sheet");
        return;
      }

      // Find relevant columns
      const columns = Object.keys(data[0]);
      const findCol = (keywords: string[]) => 
        columns.find(c => keywords.some(k => c.toLowerCase().includes(k.toLowerCase())));

      const nameCol = findCol(["name", "item", "product"]) || columns[0];
      const skuCol = findCol(["sku", "code", "barcode"]);
      const unitCol = findCol(["unit", "uom"]);
      const retail1Col = findCol(["retail1", "retail 1", "retail", "price", "rate", "mrp"]);
      const retail2Col = findCol(["retail2", "retail 2", "wholesale"]);
      const catCol = findCol(["category", "cat"]);
      const stockCol = findCol(["stock", "qty", "quantity", "count"]);

      const mapped = data.map(row => {
        const r1 = parseFloat(retail1Col ? row[retail1Col] : 0) || 0;
        const r2 = parseFloat(retail2Col ? row[retail2Col] : r1) || r1;
        const stock = parseFloat(stockCol ? row[stockCol] : 0) || 0;
        
        let categoryId = null;
        if (catCol && row[catCol]) {
          const catName = String(row[catCol]).trim().toLowerCase();
          const match = categories.find(c => c.name.toLowerCase() === catName);
          if (match) categoryId = match.id;
        }

        return {
          company_id: companyId,
          name: String(row[nameCol] || "Unnamed Item"),
          sku: skuCol ? String(row[skuCol] || "") : "",
          unit: unitCol ? String(row[unitCol] || "Pcs") : "Pcs",
          description: "",
          category_id: categoryId,
          stock: stock,
          prices: [
            { label: "Retail 1", price: r1 },
            { label: "Retail 2", price: r2 } 
          ]
        };
      });

      setItems(mapped);
    } catch (e) {
      console.error(e);
      toast.error("Failed to parse file. Ensure it is a valid spreadsheet.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!companyId || items.length === 0) return;
    setLoading(true);
    try {
      await bulkCreateItems(companyId, items);
      toast.success(`Successfully imported ${items.length} items`);
      onImport();
      onClose();
    } catch (e) {
      toast.error("Import failed: " + String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 600, width: "95%" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: "var(--primary-dim)", color: "var(--primary)", padding: 8, borderRadius: 8 }}>
              <FileSpreadsheet size={20} />
            </div>
            <h2 className="modal-title" style={{ margin: 0 }}>Import Items</h2>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        {!fileName ? (
          <div 
            onClick={handlePickFile}
            style={{ 
              border: "2px dashed var(--border)", 
              borderRadius: 12, 
              padding: "40px 20px", 
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = "var(--primary)"}
            onMouseOut={e => e.currentTarget.style.borderColor = "var(--border)"}
          >
            <Upload size={40} style={{ color: "var(--text-muted)", marginBottom: 16 }} />
            <h3 style={{ marginBottom: 8 }}>Select Excel or CSV File</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
              Supported formats: .xlsx, .xls, .csv
            </p>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--surface-2)", borderRadius: 8, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Check size={18} style={{ color: "var(--success)" }} />
                <span style={{ fontWeight: 600 }}>{fileName}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handlePickFile}>Change</button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase" }}>
                Preview ({items.length} items)
              </div>
              <div style={{ maxHeight: 250, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
                <table className="data-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>SKU</th>
                      <th>Unit</th>
                      <th>Stock</th>
                      <th style={{ textAlign: "right" }}>Retail 1</th>
                      <th style={{ textAlign: "right" }}>Retail 2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.slice(0, 10).map((it, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{it.name}</td>
                        <td>{it.sku || "-"}</td>
                        <td>{it.unit}</td>
                        <td>{it.stock}</td>
                        <td style={{ textAlign: "right" }}>₹{it.prices[0].price.toFixed(2)}</td>
                        <td style={{ textAlign: "right" }}>₹{it.prices[1].price.toFixed(2)}</td>
                      </tr>
                    ))}
                    {items.length > 10 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)", fontStyle: "italic", padding: 12 }}>
                          + {items.length - 10} more items
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, padding: 12, background: "var(--primary-dim)", borderRadius: 8, marginBottom: 24 }}>
              <AlertCircle size={18} style={{ color: "var(--primary)", flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: "var(--primary)" }}>
                Ensure your column names include keywords like "Name", "SKU", and "Price" for automatic detection.
              </p>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button 
            className="btn btn-primary" 
            onClick={handleImport} 
            disabled={loading || items.length === 0}
            style={{ minWidth: 140 }}
          >
            {loading ? <div className="spinner" /> : `Import ${items.length || ""} Items`}
          </button>
        </div>
      </div>
    </div>
  );
}
