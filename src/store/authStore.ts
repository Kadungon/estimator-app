import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, Company } from "../types";

interface AuthState {
  user: User | null;
  company: Company | null;
  companies: Company[];
  setAuth: (user: User, companies: Company[], company: Company) => void;
  switchCompany: (company: Company) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      company: null,
      companies: [],
      setAuth: (user, companies, company) => set({ user, companies, company }),
      switchCompany: (company) => set({ company }),
      logout: () => set({ user: null, company: null, companies: [] }),
      isAuthenticated: () => get().user !== null,
      isAdmin: () => get().user?.role === "admin",
    }),
    {
      name: "auth-storage",
    }
  )
);
