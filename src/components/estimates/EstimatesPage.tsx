import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Search, FileText, Trash2, Calendar, User, Edit, Filter } from "lucide-react";
import { getEstimates, deleteEstimate, getUniqueCustomers, getEstimate } from "../../lib/tauri";
import { EstimateSummary } from "../../types";
import { useAuthStore } from "../../store/authStore";
import { useCartStore } from "../../store/cartStore";

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<EstimateSummary[]>([]);
  const [customers, setCustomers] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const companyId = useAuthStore(state => state.company?.id);
  const loadEstimateIntoCart = useCartStore(state => state.loadEstimate);

  const loadData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [estData, custData] = await Promise.all([
        getEstimates(companyId, search, selectedCustomer),
        getUniqueCustomers(companyId)
      ]);
      setEstimates(estData);
      setCustomers(custData);
    } catch (e) {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId, search, selectedCustomer]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this estimate?")) return;
    try {
      await deleteEstimate(id);
      toast.success("Deleted successfully");
      loadData();
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleEdit = async (id: number) => {
    try {
      const fullEst = await getEstimate(id);
      loadEstimateIntoCart(fullEst);
      toast.success("Loaded into Billing for editing");
      navigate("/billing");
    } catch (e) {
      toast.error("Failed to load estimate details");
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
      });
    } catch { return dateStr; }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="page-header">
        <span className="page-title">Estimation History</span>
        
        <div style={{ display: 'flex', gap: 12, flex: 1, marginLeft: 24 }}>
          <div className="search-wrapper" style={{ flex: 1, maxWidth: 400 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input 
              className="input" 
              style={{ paddingLeft: 32 }}
              placeholder="Search by EST number or customer..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={14} className="text-muted" />
            <select 
              className="select" 
              style={{ width: 200, height: 38 }}
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
            >
              <option value="">All Customers</option>
              {customers.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="page-content">
        {loading && estimates.length === 0 ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : estimates.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <h3>No history found</h3>
            <p>Go to the Billing page to generate your first estimate.</p>
          </div>
        ) : (
          <div className="estimates-grid">
            {estimates.map(est => (
              <div key={est.id} className="estimate-card">
                <div style={{ background: "var(--primary-dim)", color: "var(--primary)", padding: 10, borderRadius: 8 }}>
                  <FileText size={20} />
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{est.est_number}</span>
                    <span className="badge badge-success">Rs.{est.total.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <User size={12} /> {est.customer || "Walking Customer"}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={12} /> {formatDate(est.created_at)}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(est.id)} title="View & Edit">
                    <Edit size={15} /> View / Edit
                  </button>
                  {useAuthStore.getState().isAdmin() && (
                    <button className="btn btn-icon btn-danger btn-sm" onClick={() => handleDelete(est.id)} title="Delete history">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
