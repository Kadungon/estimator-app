import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Search, Trash2, Phone, MapPin, ReceiptText, Users, User } from "lucide-react";
import { getCustomers, deleteCustomer } from "../../lib/tauri";
import { Customer } from "../../types";
import { useAuthStore } from "../../store/authStore";
import CustomerModal from "./CustomerModal";
import CustomerLedgerModal from "./CustomerLedgerModal";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null);

  const companyId = useAuthStore(state => state.company?.id);
  const location = useLocation();

  const fetchCustomers = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await getCustomers(companyId);
      setCustomers(data);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [companyId]);

  // Open ledger automatically if returned from Billing
  useEffect(() => {
    if (location.state?.openLedger && customers.length > 0) {
      const cust = customers.find(c => c.id === location.state.openLedger);
      if (cust) {
        setLedgerCustomer(cust);
        // Clear the state so it doesn't reopen if they close it and refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, customers]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    try {
      await deleteCustomer(id);
      toast.success("Customer deleted");
      fetchCustomers();
    } catch (e) {
      toast.error(String(e));
    }
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage customers and track balances</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> New Customer
        </button>
      </div>

      <div className="card">
        <div style={{ padding: 20, borderBottom: "1px solid var(--border)", display: "flex", gap: 16 }}>
          <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
            <div style={{ position: "relative" }}>
              <Search size={18} style={{ position: "absolute", left: 12, top: 10, color: "var(--text-muted)" }} />
              <input
                className="input"
                style={{ paddingLeft: 40 }}
                placeholder="Search customers..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>No customers found</h3>
            <p>Create a customer to start tracking balances.</p>
          </div>
        ) : (
          <div className="estimates-grid" style={{ padding: "20px" }}>
            {filtered.map(c => (
              <div key={c.id} className="estimate-card">
                <div style={{ background: "var(--primary-dim)", color: "var(--primary)", padding: 10, borderRadius: 8 }}>
                  <User size={20} />
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</span>
                    {c.balance > 0 ? (
                      <span className="badge badge-accent" style={{ background: "var(--danger-dim)", color: "var(--danger)" }}>
                        Due: ₹{c.balance.toFixed(2)}
                      </span>
                    ) : (
                      <span className="badge badge-success">No Due</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>
                    {c.phone && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Phone size={12} /> {c.phone}
                      </span>
                    )}
                    {c.address && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <MapPin size={12} /> {c.address}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button 
                    className="btn btn-ghost btn-sm" 
                    onClick={() => setLedgerCustomer(c)}
                  >
                    <ReceiptText size={15} /> Ledger
                  </button>
                  <button 
                    className="btn btn-icon btn-danger btn-sm" 
                    onClick={() => handleDelete(c.id)}
                    title="Delete Customer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <CustomerModal 
          onSave={() => { setShowModal(false); fetchCustomers(); }} 
          onClose={() => setShowModal(false)} 
        />
      )}

      {ledgerCustomer && (
        <CustomerLedgerModal
          customer={ledgerCustomer}
          onClose={() => setLedgerCustomer(null)}
        />
      )}
    </div>
  );
}
