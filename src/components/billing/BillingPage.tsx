import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Printer, Save, Trash2, User } from "lucide-react";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";

import { useCartStore } from "../../store/cartStore";
import { saveEstimate, generatePdf, createItem, getSettings } from "../../lib/tauri";
import { Item, Settings } from "../../types";
import { useAuthStore } from "../../store/authStore";

import SearchBar from "./SearchBar";
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
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showSaveItems, setShowSaveItems] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [confirmSetting, setConfirmSetting] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);

  const companyId = useAuthStore(state => state.company?.id);

  useEffect(() => {
    getSettings()
      .then((s: Settings) => {
        setSettings(s);
        setConfirmSetting(s.confirm_save !== "false");
      })
      .catch(() => { });
  }, []);



  // Global Ctrl+S and Ctrl+P
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") { e.preventDefault(); handleSave(); }
      if (e.ctrlKey && e.key === "p") { e.preventDefault(); handlePrint(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const handleAddFromSearch = (item: Item, priceLabel: string, price: number) => {
    cart.addItem({
      item_id: item.id,
      name: item.name,
      unit: item.unit,
      price_label: priceLabel,
      unit_price: price,
      quantity: 1,
      persisted: true,
    });
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
    // If we have an actual DB item we can show its price options
    // For on-the-fly items just allow free-editing inline
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
        company_id: companyId,
        customer: cart.customer || null,
        notes: cart.notes || null,
        subtotal: cart.subtotal(),
        discount: cart.discount,
        total: cart.total(),
        items: cart.items.map((i) => ({
          item_id: i.item_id,
          name: i.name,
          unit: i.unit,
          price_label: i.price_label,
          unit_price: i.unit_price,
          quantity: i.quantity,
        })),
      });

      toast.success(`Saved as ${estimate.est_number}`);

      // Ask where to save PDF
      const defaultDir = `${window.navigator.userAgent.includes("Linux") ? "/home" : "~"}/Documents/Estimates`;
      const savePath = await saveDialog({
        title: "Save Estimate PDF",
        defaultPath: `${defaultDir}/${estimate.est_number}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });

      if (savePath) {
        const pdfPath = await generatePdf(estimate.id, savePath, settings?.pdf_layout || "A4");
        toast.success("PDF saved!");
        await openPath(pdfPath);
      }

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

  return (
    <>
      <div className="printable-content" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Top bar */}
      <div className="page-header no-print" style={{ alignItems: "center" }}>
        <span className="page-title">New Estimate</span>
        <div style={{ flex: 1 }}>
          <SearchBar onAddItem={handleAddFromSearch} onQuickAdd={() => setShowQuickAdd(true)} />
        </div>
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
            <Save size={15} /> Save &amp; PDF
          </button>
        </div>
      </div>

      <div className="billing-shell">
        {/* Left: cart */}
        <div className="billing-left">
          {/* Customer + Notes */}
          <div style={{ display: "flex", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0, alignItems: "center" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
              <User size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <input
                id="customer-input"
                className="input"
                style={{ fontSize: 13, height: 32 }}
                placeholder="Customer name (optional)"
                value={cart.customer}
                onChange={(e) => cart.setCustomer(e.target.value)}
              />
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
            <CartTable onSelectPriceLabel={handleSelectPriceLabel} />
          </div>

          {/* Printable Totals (Visible only in print) */}
          <div className="print-only" style={{ marginTop: 20, padding: "0 12px" }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ width: 240, borderTop: "2px solid #000", paddingTop: 10 }}>
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
              </div>
            </div>
            
            <div style={{ marginTop: 30, fontSize: 11, borderTop: "1px solid #eee", paddingTop: 10 }}>
              <strong>ESTIMATE ONLY — NOT A TAX INVOICE</strong><br />
              This is not a tax invoice. GST not included. Prices are subject to change.
            </div>
          </div>
        </div>

        {/* Right: totals + recent */}
        <div className="billing-right no-print">
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

            <div style={{ marginTop: 20, padding: "12px", background: "var(--accent-dim)", borderRadius: "var(--radius-sm)", fontSize: 11, color: "var(--text-muted)", border: "1px solid var(--accent-dim)" }}>
              <strong style={{ color: "var(--accent)" }}>ESTIMATE ONLY</strong><br />
              This is not a tax invoice. GST not included.<br />
              Prices are subject to change.
            </div>
          </div>

          {/* Print button */}
          <div style={{ padding: "16px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%" }}
              onClick={handleSave}
              disabled={cart.items.length === 0 || pendingSave}
            >
              <Save size={18} /> Save &amp; PDF
            </button>
            <button
              className="btn btn-accent"
              style={{ width: "100%", height: 42 }}
              onClick={handleDirectPrint}
              disabled={cart.items.length === 0}
            >
              <Printer size={18} /> Direct Print
            </button>
            <p style={{ fontSize: 10, textAlign: "center", color: "var(--text-muted)" }}>
              Direct print uses your browser dialog
            </p>
          </div>
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
