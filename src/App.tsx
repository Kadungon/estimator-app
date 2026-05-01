import { MemoryRouter, Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect, useState } from "react";
import {
  ReceiptText, Package, History, Settings as SettingsIcon,
  Sun, Moon, Plus, LogOut, LayoutDashboard,
} from "lucide-react";
import { getSettings } from "./lib/tauri";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useAuthStore } from "./store/authStore";
import DashboardPage from "./components/dashboard/DashboardPage";
import BillingPage from "./components/billing/BillingPage";
import ItemsPage from "./components/items/ItemsPage";
import EstimatesPage from "./components/estimates/EstimatesPage";
import SettingsPage from "./components/settings/SettingsPage";
import LoginPage from "./components/auth/LoginPage";
import logo from "./assets/logo.png";

function Inner() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const navigate = useNavigate();
  const { user, company, logout, isAuthenticated } = useAuthStore();
  useKeyboardShortcuts();

  useEffect(() => {
    getSettings()
      .then((s) => {
        const t = (s.theme as "dark" | "light") || "dark";
        setTheme(t);
        document.documentElement.setAttribute("data-theme", t);
      })
      .catch(() => {
        document.documentElement.setAttribute("data-theme", "dark");
      });
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  if (!isAuthenticated()) {
    return (
      <>
        <LoginPage />
        <Toaster position="bottom-right" />
      </>
    );
  }

  return (
    <div className="app-shell" data-theme={theme}>
      {/* ── Top Bar ── */}
      <header className="app-topbar">
        <span className="logo" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={logo} alt="Estima" style={{ width: 24, height: 24, borderRadius: 4 }} />
          {company?.name || "Estima"}
        </span>
        <div className="spacer" />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 12 }}>
          {useAuthStore.getState().companies.length > 1 && (
            <select 
              className="select" 
              style={{ height: 32, fontSize: 12, width: 180, padding: "0 8px" }}
              value={company?.id}
              onChange={(e) => {
                const target = useAuthStore.getState().companies.find(c => c.id === Number(e.target.value));
                if (target) useAuthStore.getState().switchCompany(target);
              }}
            >
              {useAuthStore.getState().companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Logged in as <strong>{user?.username}</strong> ({user?.role})
          </span>
        </div>

        <button
          id="new-bill-btn"
          className="btn btn-accent btn-sm"
          onClick={() => navigate("/billing")}
          title="New Estimate (Ctrl+B)"
        >
          <Plus size={14} /> <span className="no-mobile">New Estimate</span>
        </button>

        <button
          id="theme-toggle-btn"
          className="btn btn-ghost btn-icon btn-sm"
          onClick={toggleTheme}
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button
          className="btn btn-danger btn-icon btn-sm"
          onClick={logout}
          title="Logout"
        >
          <LogOut size={15} />
        </button>
      </header>

      {/* ── Sidebar ── */}
      <aside className="app-sidebar">
        <div style={{ padding: "8px 0" }}>
          <span className="nav-section">Main</span>

          <NavLink
            id="nav-dashboard"
            to="/dashboard"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            title="Ctrl+D"
          >
            <LayoutDashboard size={16} /> Dashboard
            <span style={{ marginLeft: "auto" }}><kbd>D</kbd></span>
          </NavLink>

          <NavLink
            id="nav-billing"
            to="/billing"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            title="Ctrl+B"
          >
            <ReceiptText size={16} /> Billing
            <span style={{ marginLeft: "auto" }}><kbd>B</kbd></span>
          </NavLink>

          <NavLink
            id="nav-items"
            to="/items"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            title="Ctrl+I"
          >
            <Package size={16} /> Items
            <span style={{ marginLeft: "auto" }}><kbd>I</kbd></span>
          </NavLink>

          <NavLink
            id="nav-estimates"
            to="/estimates"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            title="Ctrl+E"
          >
            <History size={16} /> Estimates
            <span style={{ marginLeft: "auto" }}><kbd>E</kbd></span>
          </NavLink>

          <span className="nav-section" style={{ marginTop: 8 }}>System</span>

          <NavLink
            id="nav-settings"
            to="/settings"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <SettingsIcon size={16} /> Settings
          </NavLink>
        </div>

        {/* Keyboard hint at bottom */}
        <div style={{ marginTop: "auto", padding: "12px", fontSize: 11, color: "var(--text-muted)" }}>
          Hold <kbd>Ctrl</kbd> + letter to navigate
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/items" element={<ItemsPage />} />
          <Route path="/estimates" element={<EstimatesPage />} />
          <Route path="/settings" element={<SettingsPage onThemeChange={setTheme} />} />
        </Routes>
      </main>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font)",
            fontSize: 13,
          },
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <MemoryRouter initialEntries={["/dashboard"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Inner />
    </MemoryRouter>
  );
}

