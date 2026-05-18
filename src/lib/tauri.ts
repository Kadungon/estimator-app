import { invoke } from "@tauri-apps/api/core";
import type {
  Category,
  Item,
  Estimate,
  EstimateSummary,
  Settings,
  Unit,
  Customer,
} from "../types";

/**
 * Check if the application is running within the Tauri environment.
 */
export const isTauri = () => {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
};

/**
 * A wrapper around Tauri's invoke that provides a more descriptive error
 * when called from a standard browser environment.
 */
async function safeInvoke<T>(cmd: string, args?: Record<string, any>): Promise<T> {
  if (!isTauri()) {
    console.error(`[Tauri] Command "${cmd}" ignored: Not running in a Tauri context.`);
    throw new Error("Tauri environment not detected. This feature requires the desktop application.");
  }
  return invoke<T>(cmd, args);
}

// Settings
export const getSettings = () => safeInvoke<Settings>("get_settings");
export const updateSettings = (updates: Partial<Settings>) =>
  safeInvoke<void>("update_settings", { updates });

// Categories
export const getCategories = (companyId: number) => 
  safeInvoke<Category[]>("get_categories", { companyId });
export const createCategory = (companyId: number, name: string) =>
  safeInvoke<Category>("create_category", { companyId, name });
export const deleteCategory = (id: number) =>
  safeInvoke<void>("delete_category", { id });

// Items
export const getItems = (companyId: number, pattern?: string, categoryId?: number) =>
  safeInvoke<Item[]>("get_items", { companyId, pattern: pattern ?? "", categoryId: categoryId ?? null });
export const getItem = (id: number) => safeInvoke<Item>("get_item", { id });
export const createItem = (payload: unknown) =>
  safeInvoke<Item>("create_item", { payload });
export const updateItem = (id: number, payload: unknown) =>
  safeInvoke<Item>("update_item", { id, payload });
export const deleteItem = (id: number) => safeInvoke<void>("delete_item", { id });
export const bulkCreateItems = (companyId: number, items: any[]) =>
  safeInvoke<void>("bulk_create_items", { companyId, items });

// Units
export const getUnits = (companyId: number) => 
  safeInvoke<Unit[]>("get_units", { companyId });
export const createUnit = (companyId: number, name: string) =>
  safeInvoke<Unit>("create_unit", { input: { company_id: companyId, name } });
export const deleteUnit = (id: number) =>
  safeInvoke<void>("delete_unit", { id });

// Customers
export const getCustomers = (companyId: number) => 
  safeInvoke<Customer[]>("get_customers", { companyId });
export const createCustomer = (companyId: number, name: string, phone?: string, address?: string) =>
  safeInvoke<Customer>("create_customer", { input: { company_id: companyId, name, phone: phone || null, address: address || null } });
export const deleteCustomer = (id: number) =>
  safeInvoke<void>("delete_customer", { id });

// Estimates
export const getEstimates = (companyId: number, search?: string, customer?: string, customerId?: number) =>
  safeInvoke<EstimateSummary[]>("get_estimates", { companyId, search: search ?? null, customer: customer ?? null, customerId: customerId ?? null });
export const getUniqueCustomers = (companyId: number) =>
  safeInvoke<string[]>("get_unique_customers", { companyId });
export const getEstimate = (id: number) =>
  safeInvoke<Estimate>("get_estimate", { id });
export const saveEstimate = (input: unknown) =>
  safeInvoke<Estimate>("save_estimate", { input });
export const deleteEstimate = (id: number) =>
  safeInvoke<void>("delete_estimate", { id });
export const getNextEstimateNumber = (companyId: number) =>
  safeInvoke<string>("get_next_estimate_number", { companyId });

// PDF
export const generatePdf = (estimateId: number, savePath: string, pageSize: string) =>
  safeInvoke<string>("generate_pdf", { estimateId, savePath, pageSize });

// Auth
export const login = (username: string, password: string) =>
  safeInvoke<any>("login", { username, password });
export const getCompanies = () => safeInvoke<any[]>("get_companies");
export const changePassword = (userId: number, oldPass: string, newPass: string) =>
  safeInvoke<void>("change_password", { userId, oldPass, newPass });
export const createCompany = (name: string, address?: string, phone?: string, email?: string) =>
  safeInvoke<any>("create_company", { name, address: address || null, phone: phone || null, email: email || null });
export const createUser = (companyId: number, username: string, password: string) =>
  safeInvoke<void>("create_user", { companyId, username, password });
export const getAllUsers = () => safeInvoke<any[]>("get_all_users");
export const linkUserToCompany = (userId: number, companyId: number) =>
  safeInvoke<void>("link_user_to_company", { userId, companyId });
export const unlinkUserFromCompany = (userId: number, companyId: number) =>
  safeInvoke<void>("unlink_user_from_company", { userId, companyId });

// Admin
export const backupDb = () => safeInvoke<string>("backup_db");
export const resetData = (companyId: number) => safeInvoke<void>("reset_data", { companyId });
export const getDbInfo = () => safeInvoke<string>("get_db_info");
export const setDbPath = (path: string) => safeInvoke<void>("set_db_path", { path });
