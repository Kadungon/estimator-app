import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Printer, Save, Trash2, User, ArrowLeft } from "lucide-react";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";

import { useCartStore } from "../../store/cartStore";
import { saveEstimate, createItem, getSettings, getCustomers, getItems } from "../../lib/tauri";
import { Item, Settings, Customer } from "../../types";
import { useAuthStore } from "../../store/authStore";

import CartTable from "./CartTable";
import QuickAddModal from "./QuickAddModal";
import PriceLabelModal from "./PriceLabelModal";
import SaveConfirmModal from "./SaveConfirmModal";
import SaveItemsModal from "./SaveItemsModal";
import NumericInput from "../common/NumericInput";
import ConfirmModal from "../common/ConfirmModal";

export default function BillingPage() {
  const cart = useCartStore();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [priceLabelCtx, setPriceLabelCtx] = useState<{ tempId: string; item: Item | null; prices: { label: string; price: number }[] } | null>(null);
  const [addAmount, setAddAmount] = useState(0);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showSaveItems, setShowSaveItems] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [confirmSetting, setConfirmSetting] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const companyId = useAuthStore(state => state.company?.id);

  // Compact list detail toggle settings
  const [showItemDetails, setShowItemDetails] = useState<boolean>(() => {
    const saved = localStorage.getItem("estima_show_item_details");
    return saved === "true";
  });

  // Lifted keyboard-entry row states (Tally style)
  const [entryName, setEntryName] = useState("");
  const [entryPrice, setEntryPrice] = useState<number | "">("");
  const [entryQty, setEntryQty] = useState<number>(1);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedPriceLabel, setSelectedPriceLabel] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState("Pcs");

  // Search states for Tally-style right panel
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);

  // Price modal context state inside BillingPage for new entry price lists
  const [showNewPriceModal, setShowNewPriceModal] = useState(false);
  const [newPriceModalOptions, setNewPriceModalOptions] = useState<{ label: string; price: number }[]>([]);

  // Input refs for keyboard focus shifting
  const nameInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<any>(null);

  useEffect(() => {
    getSettings()
      .then((s: Settings) => {
        setSettings(s);
        setConfirmSetting(s.confirm_save !== "false");
      })
      .catch(() => { });
      
    if (companyId) {
      getCustomers(companyId).then(setCustomers).catch(console.error);
    }
  }, [companyId]);

  // Reset addAmount when estimate changes
  useEffect(() => {
    setAddAmount(0);
  }, [cart.estimateId]);

  // Global Ctrl+S and Ctrl+P
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") { e.preventDefault(); handleSave(); }
      if (e.ctrlKey && e.key === "p") { e.preventDefault(); handlePrint(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setSearchOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleNameChange = (val: string) => {
    setEntryName(val);
    
    // Reset selection details if they start retyping/editing
    if (selectedItem) {
      setSelectedItem(null);
      setSelectedPriceLabel(null);
      setEntryPrice("");
    }

    clearTimeout(searchTimer.current);
    if (!val.trim() || !companyId) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await getItems(companyId, val);
        setSearchResults(res);
        setSearchOpen(true);
        setActiveSearchIndex(0);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    }, 150);
  };

  const selectItem = (item: Item) => {
    setSelectedItem(item);
    setSelectedUnit(item.unit || "Pcs");
    setSearchResults([]);
    setSearchOpen(false);
    setEntryName(item.name);

    if (item.prices && item.prices.length > 0) {
      if (item.prices.length > 1) {
        // Has multiple prices! Open the price modal
        setNewPriceModalOptions(item.prices.map(p => ({ label: p.label, price: p.price })));
        setShowNewPriceModal(true);
      } else {
        // Only one price option, select it directly
        const p = item.prices[0];
        setSelectedPriceLabel(p.label);
        setEntryPrice(p.price);
        // Automatically focus Rate field!
        setTimeout(() => priceInputRef.current?.focus(), 50);
      }
    } else {
      setSelectedPriceLabel("Custom");
      setEntryPrice(0);
      // Focus rate field
      setTimeout(() => priceInputRef.current?.focus(), 50);
    }
  };

  const commitAddItem = () => {
    const name = entryName.trim();
    if (!name) return;

    const finalPrice = typeof entryPrice === "number" ? entryPrice : 0;
    const finalQty = typeof entryQty === "number" && entryQty > 0 ? entryQty : 1;

    cart.addItem({
      item_id: selectedItem ? selectedItem.id : null,
      name: name,
      unit: selectedUnit,
      price_label: selectedPriceLabel || "Custom",
      unit_price: finalPrice,
      quantity: finalQty,
      persisted: !!selectedItem,
    });

    // Reset local states for next item!
    setEntryName("");
    setEntryPrice("");
    setEntryQty(1);
    setSelectedItem(null);
    setSelectedPriceLabel(null);
    setSelectedUnit("Pcs");
    setSearchResults([]);
    setSearchOpen(false);

    // Focus name input for the next item
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const handleQuickAdd = (name: string, price: number, unit: string) => {
    cart.addItem({
      item_id: null,
      name,
      unit,
      price_label: null,
      unit_price: price,
      quantity: 1,
      persisted: false,
    });
  };

  const handleSelectPriceLabel = (tempId: string, item: Item | null, _currentLabel: string | null, _currentPrice: number) => {
    if (item && item.prices.length > 0) {
      setPriceLabelCtx({ tempId, item, prices: item.prices.map((p) => ({ label: p.label, price: p.price })) });
    }
  };

  const handleSave = useCallback(() => {
    if (cart.items.length === 0) { toast.error("Cart is empty"); return; }
    if (confirmSetting) { setShowSaveConfirm(true); } else { doSave(); }
  }, [cart.items, confirmSetting]);

  const handleDirectPrint = () => {
    if (cart.items.length === 0) return toast.error("Nothing to print");
    window.print();
  };

  const handlePrint = useCallback(() => {
    handleDirectPrint();
  }, [cart.items]);

  const doSave = async () => {
    setPendingSave(true);
    try {
      const unsaved = cart.items.filter((i) => !i.persisted);
      if (unsaved.length > 0) {
        setShowSaveItems(true);
        return; // will continue after modal
      }
      await commitSave([]);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setPendingSave(false);
    }
  };

  const commitSave = async (itemsToSave: string[]) => {
    if (!companyId) return;
    setPendingSave(true);
    try {
      // Save on-the-fly items to DB if user agreed
      for (const name of itemsToSave) {
        const ci = cart.items.find((i) => i.name === name && !i.persisted);
        if (ci) {
          await createItem({ 
            company_id: companyId,
            sku: null, 
            name: ci.name, 
            unit: ci.unit || "Pcs", 
            description: null, 
            category_id: null, 
            prices: [{ label: "Retail", price: ci.unit_price }] 
          });
        }
      }

      const estimate = await saveEstimate({
        id: cart.estimateId,
        company_id: companyId,
        customer: cart.customer || null,
        customer_id: cart.customerId || null,
        notes: cart.notes || null,
        subtotal: cart.subtotal(),
        discount: cart.discount,
        total: cart.total(),
        amount_paid: cart.amountPaid,
        deduct_stock: cart.deductStock,
        items: cart.items.map((i) => ({
          item_id: i.item_id,
          name: i.name,
          unit: i.unit,
          price_label: i.price_label,
          unit_price: i.unit_price,
          quantity: i.quantity,
        })),
      });

      toast.success(cart.estimateId ? `Updated ${estimate.est_number}` : `Saved as ${estimate.est_number}`);
      cart.clearCart();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setPendingSave(false);
      setShowSaveItems(false);
      setShowSaveConfirm(false);
    }
  };

  const subtotal = cart.subtotal();
  const total = cart.total();

  const location = useLocation();
  const navigate = useNavigate();
  const fromCustomerLedger = location.state?.fromCustomerLedger as number | undefined;

  return (
    <>
      <div className={`printable-content ${settings?.pdf_layout === 'A5' ? 'print-a5' : 'print-a4'}`} style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* Top bar */}
        <div className="page-header no-print" style={{ alignItems: "center" }}>
          {fromCustomerLedger && (
            <button 
              className="btn btn-ghost btn-sm btn-icon" 
              style={{ marginRight: 8 }}
              onClick={() => navigate("/customers", { state: { openLedger: fromCustomerLedger } })}
              title="Back to Ledger"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <span className="page-title">{cart.estimateId ? `Edit ${cart.estNumber || 'Estimate'}` : "New Estimate"}</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button id="clear-cart-btn" className="btn btn-ghost btn-sm" onClick={() => setShowClearConfirm(true)} title="Clear cart">
              <Trash2 size={14} /> Clear
            </button>

            <button
              id="save-estimate-btn"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={pendingSave || cart.items.length === 0}
              title="Save estimate (Ctrl+S)"
            >
              <Save size={15} /> Save Estimate
            </button>
          </div>
        </div>

        <div className="billing-shell">
          {/* Left: cart */}
          <div className="billing-left">
            {/* Print Header (Visible only in print) */}
            <div className="print-only" style={{ padding: "16px 20px", borderBottom: "2px solid #000", marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: 20, textAlign: "center", textTransform: "uppercase" }}>Estimate</h2>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                <div>
                  <div style={{ fontSize: 13 }}><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
                  {cart.customer && <div style={{ fontSize: 13, marginTop: 4 }}><strong>Customer:</strong> {cart.customer}</div>}
                </div>
                <div style={{ textAlign: "right", fontSize: 13 }}>
                  <div><strong>Est No:</strong> {cart.estNumber || "DRAFT"}</div>
                </div>
              </div>
            </div>

            {/* Customer + Notes */}
            <div className="no-print" style={{ display: "flex", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0, alignItems: "center" }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                <User size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                <input
                  id="customer-input"
                  className="input"
                  style={{ fontSize: 13, height: 32 }}
                  placeholder="Customer name (optional)"
                  value={cart.customer}
                  list="customer-list"
                  onChange={(e) => {
                    const val = e.target.value;
                    cart.setCustomer(val);
                    const match = customers.find(c => c.name.toLowerCase() === val.toLowerCase());
                    cart.setCustomerId(match ? match.id : null);
                  }}
                />
                <datalist id="customer-list">
                  {customers.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
              <input
                id="notes-input"
                className="input"
                style={{ flex: 1, fontSize: 13, height: 32 }}
                placeholder="Notes (optional)"
                value={cart.notes}
                onChange={(e) => cart.setNotes(e.target.value)}
              />
            </div>

            {/* Cart table */}
            <div className="cart-table-wrapper">
              <CartTable 
                onSelectPriceLabel={handleSelectPriceLabel}
                entryName={entryName}
                setEntryName={handleNameChange}
                entryPrice={entryPrice}
                setEntryPrice={setEntryPrice}
                entryQty={entryQty}
                setEntryQty={setEntryQty}
                selectedItem={selectedItem}
                setSelectedItem={setSelectedItem}
                selectedPriceLabel={selectedPriceLabel}
                setSelectedPriceLabel={setSelectedPriceLabel}
                selectedUnit={selectedUnit}
                setSelectedUnit={setSelectedUnit}
                searchResults={searchResults}
                setSearchResults={setSearchResults}
                searchOpen={searchOpen}
                setSearchOpen={setSearchOpen}
                activeSearchIndex={activeSearchIndex}
                setActiveSearchIndex={setActiveSearchIndex}
                selectItem={selectItem}
                commitAddItem={commitAddItem}
                nameInputRef={nameInputRef}
                priceInputRef={priceInputRef}
                qtyInputRef={qtyInputRef}
              />
            </div>

            {/* Printable Totals (Visible only in print) */}
            <div className="print-only" style={{ marginTop: 10, padding: "0 12px" }}>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ width: 220, borderTop: "1px solid #000", paddingTop: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>Subtotal:</span>
                    <span>Rs.{cart.subtotal().toFixed(2)}</span>
                  </div>
                  {cart.discount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>Discount:</span>
                      <span>- Rs.{cart.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "1px solid #000" }}>
                    <span style={{ fontWeight: 800, fontSize: 16 }}>GRAND TOTAL:</span>
                    <span style={{ fontWeight: 800, fontSize: 16 }}>Rs.{cart.total().toFixed(2)}</span>
                  </div>
                  {cart.amountPaid > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <span style={{ fontWeight: 600 }}>Amount Paid:</span>
                      <span>Rs.{cart.amountPaid.toFixed(2)}</span>
                    </div>
                  )}
                  {settings?.show_balance_on_print === "true" && cart.total() - cart.amountPaid > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, color: "#d32f2f" }}>
                      <span style={{ fontWeight: 600 }}>Balance Due:</span>
                      <span>Rs.{(cart.total() - cart.amountPaid).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ marginTop: 30, fontSize: 11, borderTop: "1px solid #eee", paddingTop: 10 }}>
                <strong>ESTIMATE ONLY — NOT A TAX INVOICE</strong><br />
                This is not a tax invoice. GST not included. Prices are subject to change.
              </div>
            </div>
          </div>

          {/* Right: Tally-style list of items OR Estimate Summary totals */}
          <div className="billing-right no-print">
            {searchOpen && entryName.trim() ? (
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }} onClick={(e) => e.stopPropagation()}>
                <div style={{ 
                  padding: "12px 16px", 
                  borderBottom: "1px solid var(--border)", 
                  background: "var(--primary-dim)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 12, color: "var(--primary)", letterSpacing: "0.08em" }}>LIST OF STOCK ITEMS</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                      Use ↑ ↓ Arrow Keys & Enter to Select
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      id="toggle-details"
                      checked={showItemDetails}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setShowItemDetails(val);
                        localStorage.setItem("estima_show_item_details", String(val));
                      }}
                      style={{ width: 14, height: 14, cursor: "pointer", accentColor: "var(--primary)" }}
                    />
                    <label htmlFor="toggle-details" style={{ fontSize: 11, fontWeight: 600, cursor: "pointer", userSelect: "none" }}>
                      Details
                    </label>
                  </div>
                </div>
                
                <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                  {searchResults.length === 0 ? (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
                      <h3 style={{ fontSize: 13, fontWeight: 600 }}>No matching items</h3>
                      <p style={{ fontSize: 11, marginTop: 4 }}>
                        Press Enter or Tab to add as custom.
                      </p>
                    </div>
                  ) : (
                    searchResults.map((item, idx) => {
                      const isSelected = idx === activeSearchIndex;
                      return (
                        <div
                          key={item.id}
                          style={{
                            padding: showItemDetails ? "10px 12px" : "6px 10px",
                            borderRadius: "var(--radius-sm)",
                            cursor: "pointer",
                            marginBottom: showItemDetails ? 6 : 4,
                            transition: "all var(--trans)",
                            background: isSelected ? "var(--primary-dim)" : "var(--surface-2)",
                            border: isSelected ? "1px solid var(--primary)" : "1px solid var(--border)",
                            boxShadow: isSelected ? "0 4px 12px var(--primary-dim)" : undefined,
                          }}
                          onMouseEnter={() => setActiveSearchIndex(idx)}
                          onClick={(e) => {
                            e.stopPropagation();
                            selectItem(item);
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ fontWeight: 700, fontSize: 12.5, color: isSelected ? "var(--primary)" : "var(--text)" }}>
                              {item.name}
                            </div>
                            {showItemDetails && item.stock !== undefined && (
                              <span className={`badge ${item.stock > 0 ? "badge-success" : "badge-accent"}`} style={{ fontSize: 9, padding: "1px 4px", flexShrink: 0 }}>
                                Stock: {item.stock} {item.unit || "Pcs"}
                              </span>
                            )}
                          </div>
                          
                          {showItemDetails && (
                            <>
                              <div style={{ display: "flex", gap: 6, fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                                {item.sku && <span>SKU: <strong>{item.sku}</strong></span>}
                                {item.category_name && <span>· Cat: <strong>{item.category_name}</strong></span>}
                              </div>

                              {item.prices && item.prices.length > 0 && (
                                <div style={{ marginTop: 6, borderTop: "1px solid var(--border)", paddingTop: 6 }}>
                                  <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 3 }}>
                                    Prices:
                                  </div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                    {item.prices.map((p) => (
                                      <div 
                                        key={p.label} 
                                        style={{ 
                                          fontSize: 10, 
                                          padding: "1px 4px", 
                                          background: "var(--surface)", 
                                          borderRadius: 3,
                                          border: "1px solid var(--border)",
                                          display: "flex",
                                          gap: 2
                                        }}
                                      >
                                        <span style={{ color: "var(--text-muted)" }}>{p.label}:</span>
                                        <span style={{ fontWeight: 700, color: "var(--primary)" }}>Rs.{p.price.toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 700, fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.05em" }}>ESTIMATE SUMMARY</div>
                </div>

                <div className="totals-section" style={{ flex: 1 }}>
                  <div className="totals-row">
                    <span>Items</span>
                    <span>{cart.items.length}</span>
                  </div>
                  <div className="totals-row">
                    <span>Subtotal</span>
                    <span>Rs.{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="totals-row" style={{ alignItems: "center", marginTop: 4 }}>
                    <span>Discount (Rs.)</span>
                    <NumericInput
                      value={cart.discount}
                      onChange={(val) => cart.setDiscount(val)}
                      style={{ width: 100 }}
                    />
                  </div>
                  <div className="totals-row grand" style={{ marginTop: 12 }}>
                    <span>TOTAL</span>
                    <span style={{ color: "var(--primary)" }}>Rs.{total.toFixed(2)}</span>
                  </div>
                  {cart.estimateId && cart.initialPaid > 0 && (
                    <div className="totals-row" style={{ fontSize: 12, opacity: 0.8 }}>
                      <span>Previously Paid</span>
                      <span>Rs.{cart.initialPaid.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="totals-row" style={{ alignItems: "center", marginTop: 8 }}>
                    <span>{cart.estimateId ? "Add Payment (Rs.)" : "Paid (Rs.)"}</span>
                    <NumericInput
                      value={cart.estimateId ? addAmount : cart.amountPaid}
                      onChange={(val) => {
                        if (cart.estimateId) {
                          setAddAmount(val);
                          cart.setAmountPaid(cart.initialPaid + val);
                        } else {
                          cart.setAmountPaid(val);
                        }
                      }}
                      style={{ width: 100 }}
                    />
                  </div>
                  <div className="totals-row" style={{ marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                    <span>Balance</span>
                    <span style={{ color: Math.max(0, total - cart.amountPaid) > 0 ? "var(--error)" : "var(--text)" }}>
                      Rs.{Math.max(0, total - cart.amountPaid).toFixed(2)}
                    </span>
                  </div>

                  <div style={{ 
                    marginTop: 10, 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 8, 
                    padding: "6px 10px", 
                    background: "var(--surface-2)", 
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)"
                  }}>
                    <input 
                      type="checkbox" 
                      id="deduct-stock-checkbox"
                      checked={cart.deductStock}
                      onChange={(e) => cart.setDeductStock(e.target.checked)}
                      style={{ 
                        width: 15, 
                        height: 15, 
                        accentColor: "var(--primary)", 
                        cursor: "pointer" 
                      }}
                    />
                    <label 
                      htmlFor="deduct-stock-checkbox" 
                      style={{ 
                        fontSize: 11.5, 
                        fontWeight: 600, 
                        cursor: "pointer",
                        userSelect: "none"
                      }}
                    >
                      Deduct Inventory Stock
                    </label>
                  </div>

                  <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--accent-dim)", borderRadius: "var(--radius-sm)", fontSize: 10.5, color: "var(--text-muted)", border: "1px solid var(--accent-dim)" }}>
                    <strong style={{ color: "var(--accent)" }}>ESTIMATE ONLY</strong><br />
                    This is not a tax invoice. GST not included.<br />
                    Prices are subject to change.
                  </div>
                </div>

                {/* Print button */}
                <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 6 }}>
                  <button
                    className="btn btn-primary"
                    style={{ width: "100%", height: 36, fontSize: 12.5 }}
                    onClick={handleSave}
                    disabled={cart.items.length === 0 || pendingSave}
                  >
                    <Save size={16} /> Save Estimate
                  </button>
                  <button
                    className="btn btn-accent"
                    style={{ width: "100%", height: 36, fontSize: 12.5 }}
                    onClick={handleDirectPrint}
                    disabled={cart.items.length === 0}
                  >
                    <Printer size={16} /> Direct Print
                  </button>
                  <p style={{ fontSize: 9.5, textAlign: "center", color: "var(--text-muted)", marginTop: 2 }}>
                    Direct print uses your browser dialog
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showQuickAdd && (
        <QuickAddModal onAdd={handleQuickAdd} onClose={() => setShowQuickAdd(false)} />
      )}
      {priceLabelCtx && (
        <PriceLabelModal
          prices={priceLabelCtx.prices}
          onSelect={(label, price) => {
            useCartStore.getState().updatePrice(priceLabelCtx.tempId, price);
            useCartStore.getState().updatePriceLabel(priceLabelCtx.tempId, label);
            setPriceLabelCtx(null);
          }}
          onClose={() => setPriceLabelCtx(null)}
        />
      )}
      {showNewPriceModal && (
        <PriceLabelModal
          prices={newPriceModalOptions}
          onSelect={(label, price) => {
            setSelectedPriceLabel(label);
            setEntryPrice(price);
            setShowNewPriceModal(false);
            // Move focus to Rate input
            setTimeout(() => priceInputRef.current?.focus(), 50);
          }}
          onClose={() => {
            setShowNewPriceModal(false);
            // Focus back to item name input so they can correct/choose again
            setTimeout(() => nameInputRef.current?.focus(), 50);
          }}
        />
      )}
      {showSaveConfirm && (
        <SaveConfirmModal
          onConfirm={() => { setShowSaveConfirm(false); doSave(); }}
          onCancel={() => setShowSaveConfirm(false)}
        />
      )}
      {showSaveItems && (
        <SaveItemsModal
          items={cart.items.filter((i) => !i.persisted).map((i) => i.name)}
          onConfirm={(names) => commitSave(names)}
          onSkip={() => commitSave([])}
          onClose={() => { setShowSaveItems(false); setPendingSave(false); }}
        />
      )}
      {showClearConfirm && (
        <ConfirmModal
          title="Clear Cart"
          message="Are you sure you want to remove all items from the current estimate? This action cannot be undone."
          confirmLabel="Clear All"
          variant="danger"
          onConfirm={() => { cart.clearCart(); setShowClearConfirm(false); }}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
    </>
  );
}
