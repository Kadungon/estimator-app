import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Plus, Search, Edit2, Trash2, Tag, X, FileSpreadsheet } from "lucide-react";
import { getItems, deleteItem, getCategories, deleteCategory } from "../../lib/tauri";
import { Item, Category } from "../../types";
import { useAuthStore } from "../../store/authStore";
import ItemModal from "./ItemModal";
import CategoryModal from "./CategoryModal";
import ImportModal from "./ImportModal";
import ConfirmModal from "../common/ConfirmModal";

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState<{ open: boolean; item?: Item }>({ open: false });
  const [showCatList, setShowCatList] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; type: 'item' | 'category' } | null>(null);

  const companyId = useAuthStore(state => state.company?.id);
  const isAdmin = useAuthStore(state => state.isAdmin());

  const loadData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [itemList, catList] = await Promise.all([
        getItems(companyId, search, selectedCat),
        getCategories(companyId)
      ]);
      setItems(itemList);
      setCategories(catList);
    } catch (e) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId, search, selectedCat]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === 'item') {
        await deleteItem(confirmDelete.id);
        toast.success("Item deleted");
      } else {
        await deleteCategory(confirmDelete.id);
        toast.success("Category deleted");
      }
      setConfirmDelete(null);
      loadData();
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleExport = async () => {
    if (items.length === 0) return toast.error("No items to export");
    
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");
      const XLSX = await import("xlsx");

      const path = await save({
        defaultPath: "inventory_export.xlsx",
        filters: [{ name: "Excel", extensions: ["xlsx"] }]
      });

      if (!path) return;

      const data = items.map(it => ({
        "Name": it.name,
        "SKU": it.sku || "",
        "Unit": it.unit || "Pcs",
        "Stock": it.stock || 0,
        "Retail 1": it.prices[0]?.price || 0,
        "Retail 2": it.prices[1]?.price || 0,
        "Category": it.category_name || ""
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      
      // Set column widths
      ws["!cols"] = [
        { wch: 35 }, // Name
        { wch: 15 }, // SKU
        { wch: 10 }, // Unit
        { wch: 10 }, // Stock
        { wch: 12 }, // Retail 1
        { wch: 12 }, // Retail 2
        { wch: 20 }, // Category
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory");

      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      await writeFile(path, new Uint8Array(buf));
      
      toast.success("Inventory exported successfully");
    } catch (e) {
      toast.error("Export failed: " + String(e));
    }
  };


  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="page-header" style={{ alignItems: "center" }}>
        <span className="page-title">Master Items</span>
        <div style={{ display: "flex", gap: 10, flex: 1, maxWidth: 600, alignItems: "center" }}>
          <div className="search-wrapper" style={{ flex: 2 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", zIndex: 1 }} />
            <input 
              className="input" 
              style={{ paddingLeft: 32 }}
              placeholder="Filter by name or SKU..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="select" 
            style={{ flex: 1 }}
            value={selectedCat || ""}
            onChange={(e) => setSelectedCat(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isAdmin && (
            <>
              <button className="btn btn-ghost" onClick={handleExport}>
                <FileSpreadsheet size={16} /> Export
              </button>
              <button className="btn btn-ghost" onClick={() => setShowImport(true)}>
                <FileSpreadsheet size={16} /> Import
              </button>
              <button className="btn btn-ghost" onClick={() => setShowCatList(true)}>
                <Tag size={16} /> Manage Categories
              </button>
              <button id="add-item-btn" className="btn btn-primary" onClick={() => setShowModal({ open: true })}>
                <Plus size={16} /> Add New Item
              </button>
            </>
          )}
        </div>
      </div>


      <div className="page-content">
        {loading && items.length === 0 ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <PackageIcon />
            <h3>No items found</h3>
            <p>Add your first item to the master database to get started.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Item Details</th>
                <th>Category</th>
                <th style={{ width: 100 }}>Unit</th>
                <th style={{ width: 100 }}>Stock</th>
                <th style={{ width: 220 }}>Prices</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {item.sku ? `SKU: ${item.sku}` : "No SKU"}
                    </div>
                  </td>
                  <td>
                    {item.category_name ? (
                      <span className="badge badge-primary"><Tag size={10} style={{ marginRight: 4 }} /> {item.category_name}</span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: 13 }}>{item.unit || "Pcs"}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, fontSize: 13, color: item.stock <= 5 ? "var(--error)" : "inherit" }}>
                      {item.stock}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {item.prices.map(p => (
                        <div key={p.id} style={{ fontSize: 12 }}>
                          <span style={{ color: "var(--text-muted)" }}>{p.label}:</span>{" "}
                          <span style={{ fontWeight: 600 }}>₹{p.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>
                    {isAdmin ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-icon btn-ghost" onClick={() => setShowModal({ open: true, item })} title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-icon btn-danger" onClick={() => setConfirmDelete({ id: item.id, type: 'item' })} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Read-only</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal.open && (
        <ItemModal 
          item={showModal.item} 
          categories={categories}
          onSave={() => { setShowModal({ open: false }); loadData(); }}
          onCategoryAdded={() => loadData()}
          onClose={() => setShowModal({ open: false })}
        />
      )}

      {/* Category List Modal */}
      {showCatList && (
        <div className="modal-overlay" onClick={() => setShowCatList(false)}>
          <div className="modal-box" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
             <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h2 className="modal-title" style={{ margin: 0 }}>Categories</h2>
                <button className="btn btn-icon btn-ghost" onClick={() => setShowCatList(false)}><X size={18} /></button>
             </div>
             <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto", marginBottom: 20 }}>
                {categories.length === 0 ? (
                  <p style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>No categories created yet.</p>
                ) : categories.map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--accent-dim)", borderRadius: 8 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <button className="btn btn-icon btn-danger btn-sm" onClick={() => setConfirmDelete({ id: c.id, type: 'category' })}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
             </div>
             <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setShowAddCat(true)}>
                <Plus size={16} /> Add Category
              </button>
          </div>
        </div>
      )}

      {showAddCat && (
        <CategoryModal onSave={() => { setShowAddCat(false); loadData(); }} onClose={() => setShowAddCat(false)} />
      )}

      {showImport && (
        <ImportModal onImport={loadData} onClose={() => setShowImport(false)} />
      )}

      {confirmDelete && (
        <ConfirmModal
          title={confirmDelete.type === 'item' ? "Delete Item" : "Delete Category"}
          message={confirmDelete.type === 'item' 
            ? "Are you sure you want to delete this item? This action cannot be undone."
            : "Are you sure you want to delete this category? Items in this category will become unassigned."}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>

  );
}

function PackageIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}
