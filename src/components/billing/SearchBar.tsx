import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Plus, Zap } from "lucide-react";
import { getItems } from "../../lib/tauri";
import { Item } from "../../types";
import { useAuthStore } from "../../store/authStore";

interface Props {
  onAddItem: (item: Item, priceLabel: string, price: number) => void;
  onQuickAdd: () => void;
}

export default function SearchBar({ onAddItem, onQuickAdd }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timer = useRef<any>(null);
  const companyId = useAuthStore(state => state.company?.id);

  // Focus search on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  const search = useCallback((q: string) => {
    clearTimeout(timer.current);
    if (!q.trim() || !companyId) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const items = await getItems(companyId, q);
        setResults(items);
        setOpen(true);
        setSelected(0);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }, 150);
  }, [companyId]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    search(v);
  };

  const resultsFlattened = results.flatMap((item) => {
    if (item.prices.length === 0) return [{ item, label: "Custom", price: 0 }];
    return item.prices.map(p => ({ item, label: p.label, price: p.price }));
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, resultsFlattened.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && resultsFlattened[selected]) {
      e.preventDefault();
      const res = resultsFlattened[selected];
      onAddItem(res.item, res.label, res.price);
      setQuery("");
      setResults([]);
      setOpen(false);
    }
    if (e.key === "Escape") { setOpen(false); }
  };

  const clear = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="search-wrapper" ref={containerRef}>

      <div style={{ position: "relative" }}>
        <Search
          size={16}
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
        />
        <input
          ref={inputRef}
          id="search-bar-input"
          className="input"
          style={{ paddingLeft: 36, paddingRight: query ? 72 : 36 }}
          placeholder="Search item name or scan barcode… (Tab to add)"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query && setOpen(true)}
          autoComplete="off"
        />
        {loading && (
          <div className="spinner" style={{ position: "absolute", right: query ? 40 : 12, top: "50%", transform: "translateY(-50%)" }} />
        )}
        {query && (
          <button className="btn btn-icon btn-ghost btn-sm" style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)" }} onClick={clear}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="search-dropdown">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Search Results</span>
            <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setOpen(false)}><X size={14} /></button>
          </div>
          
          {results.length === 0 ? (
            <div style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: 13 }}>
              No items found.{" "}
              <button className="btn btn-primary btn-sm" style={{ marginLeft: 8 }} onClick={() => { setOpen(false); onQuickAdd(); }}>
                <Plus size={13} /> Quick Add
              </button>
            </div>
          ) : (
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {resultsFlattened.map((res, idx) => (
                <div
                  key={`${res.item.id}-${res.label}`}
                  className={`search-result-item${idx === selected ? " selected" : ""}`}
                  onMouseEnter={() => setSelected(idx)}
                  onClick={() => {
                    onAddItem(res.item, res.label, res.price);
                    setQuery("");
                    setResults([]);
                    setOpen(false);
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="search-result-name">{res.item.name}</div>
                      <span className="badge badge-primary" style={{ fontSize: 10 }}>{res.label}</span>
                    </div>
                    <div className="search-result-meta">
                      {res.item.category_name && <span>{res.item.category_name} · </span>}
                      {res.item.sku && <span>SKU: {res.item.sku} · </span>}
                      <span style={{ color: "var(--primary)", fontWeight: 600 }}>Rs.{res.price.toFixed(2)}</span>
                    </div>
                  </div>
                  <Zap size={13} style={{ color: "var(--text-muted)" }} />
                </div>
              ))}
              <div style={{ padding: "8px 14px", borderTop: "1px solid var(--border)" }}>
                <button className="btn btn-ghost btn-sm" style={{ width: "100%" }} onClick={() => { setOpen(false); onQuickAdd(); }}>
                  <Plus size={13} /> Item not listed? Quick Add
                </button>
              </div>
            </div>

          )}
        </div>
      )}

    </div>
  );
}
