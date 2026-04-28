import { useState } from "react";
import toast from "react-hot-toast";
import { LogIn, User, Lock, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useAuthStore } from "../../store/authStore";
import { User as UserType, Company as CompanyType } from "../../types";
import logo from "../../assets/logo.png";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<CompanyType[]>([]);
  const [loggedInUser, setLoggedInUser] = useState<UserType | null>(null);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Please enter credentials");
      return;
    }

    setLoading(true);
    try {
      const [user, comps] = await invoke<[UserType, CompanyType[]]>("login", {
        username,
        password,
      });

      if (comps.length === 0) {
        toast.error("No companies linked to this account");
      } else if (comps.length === 1) {
        setAuth(user, comps, comps[0]);
        toast.success(`Welcome back, ${user.username}!`);
      } else {
        setLoggedInUser(user);
        setCompanies(comps);
      }
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };

  const selectCompany = (company: CompanyType) => {
    if (loggedInUser) {
      setAuth(loggedInUser, companies, company);
      toast.success(`Welcome back, ${loggedInUser.username}!`);
    }
  };

  if (loggedInUser && companies.length > 1) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ maxWidth: 460 }}>
          <div className="login-header">
            <div className="logo-circle"><img src={logo} alt="Estima" style={{ width: 42, height: 42 }} /></div>
            <h1>Select Company</h1>
            <p>Welcome, {loggedInUser.username}. Choose a company to manage.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
            {companies.map((c) => (
              <button
                key={c.id}
                className="btn btn-ghost"
                style={{ justifyContent: "flex-start", height: 54, padding: "0 20px" }}
                onClick={() => selectCompany(c)}
              >
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{c.address || "No address"}</div>
                </div>
              </button>
            ))}
          </div>
          <button 
            className="btn btn-ghost btn-sm" 
            style={{ marginTop: 20, width: "100%" }}
            onClick={() => { setLoggedInUser(null); setCompanies([]); }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-circle">
            <img src={logo} alt="Estima" style={{ width: 42, height: 42 }} />
          </div>
          <h1>Estima</h1>
          <p>Sign in to manage your estimations</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Username</label>
            <div className="input-with-icon">
              <User size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon">
              <Lock size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="login-button">
            {loading ? (
              <Loader2 size={20} className="spin" />
            ) : (
              <>
                <LogIn size={20} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Default credentials: admin / admin</p>
        </div>
      </div>
    </div>
  );
}
