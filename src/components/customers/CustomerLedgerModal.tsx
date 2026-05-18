import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { X, Edit } from "lucide-react";
import { getEstimates, getEstimate } from "../../lib/tauri";
import { Customer, EstimateSummary } from "../../types";
import { useCartStore } from "../../store/cartStore";

interface Props {
  customer: Customer;
  onClose: () => void;
}

export default function CustomerLedgerModal({ customer, onClose }: Props) {
  const [estimates, setEstimates] = useState<EstimateSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const loadEstimateIntoCart = useCartStore(state => state.loadEstimate);

  useEffect(() => {
    const fetchLedger = async () => {
      setLoading(true);
      try {
        const data = await getEstimates(customer.company_id, undefined, undefined, customer.id);
        setEstimates(data);
      } catch (e) {
        toast.error(String(e));
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, [customer]);

  const handleEdit = async (id: number) => {
    try {
      const fullEst = await getEstimate(id);
      loadEstimateIntoCart(fullEst);
      toast.success("Loaded estimate into Billing");
      onClose(); // Close the modal
      navigate("/billing", { state: { fromCustomerLedger: customer.id } });
    } catch (e) {
      toast.error("Failed to load estimate details");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 999 }}>
      <div className="modal-box" style={{ maxWidth: 800, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 className="modal-title" style={{ margin: 0 }}>{customer.name} - Ledger</h2>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              Total Outstanding: <strong style={{ color: customer.balance > 0 ? "var(--error)" : "var(--text)" }}>₹{customer.balance.toFixed(2)}</strong>
            </div>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading ledger...</div>
          ) : estimates.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No bills found for this customer.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Date</th>
                  <th style={{ width: 140 }}>Bill #</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th style={{ textAlign: "right", width: 120 }}>Paid</th>
                  <th style={{ textAlign: "right", width: 120 }}>Balance</th>
                  <th style={{ width: 80, textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {estimates.map(e => {
                  const balance = Math.max(0, e.total - e.amount_paid);
                  return (
                    <tr key={e.id}>
                      <td>{new Date(e.created_at.replace(" ", "T") + "Z").toLocaleDateString()}</td>
                      <td style={{ fontWeight: 500 }}>{e.est_number}</td>
                      <td style={{ textAlign: "right", fontWeight: 500 }}>₹{e.total.toFixed(2)}</td>
                      <td style={{ textAlign: "right", color: "var(--success)" }}>₹{e.amount_paid.toFixed(2)}</td>
                      <td style={{ textAlign: "right", color: balance > 0 ? "var(--danger)" : "var(--text-muted)" }}>
                        ₹{balance.toFixed(2)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button 
                          className="btn btn-ghost btn-sm btn-icon" 
                          onClick={() => handleEdit(e.id)} 
                          title="Open in Billing"
                        >
                          <Edit size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
