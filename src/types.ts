// Shared TypeScript types mirroring Rust models

export interface Company {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export interface User {
  id: number;
  username: string;
  role: string;
}

export interface Category {
  id: number;
  company_id: number;
  name: string;
  created_at: string;
}

export interface ItemPrice {
  id: number;
  item_id: number;
  label: string;
  price: number;
}

export interface Item {
  id: number;
  company_id: number;
  sku: string | null;
  name: string;
  unit: string | null;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  created_at: string;
  prices: ItemPrice[];
}

export interface EstimateItem {
  id: number;
  estimate_id: number;
  item_id: number | null;
  name: string;
  unit: string | null;
  price_label: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface Estimate {
  id: number;
  company_id: number;
  est_number: string;
  customer: string | null;
  notes: string | null;
  subtotal: number;
  discount: number;
  total: number;
  pdf_path: string | null;
  created_at: string;
  items: EstimateItem[];
}

export interface EstimateSummary {
  id: number;
  est_number: string;
  customer: string | null;
  total: number;
  created_at: string;
}

export interface Settings {
  shop_name: string;
  shop_address: string;
  shop_phone: string;
  shop_email: string;
  pdf_layout: string;
  theme: string;
  confirm_save: string;
  estimates_dir: string;
}

// Cart types (frontend-only)
export interface CartItem {
  tempId: string;          // UUID for react key, not persisted
  item_id: number | null;  // null = on-the-fly
  name: string;
  unit: string | null;
  price_label: string | null;
  unit_price: number;
  quantity: number;
  persisted: boolean;      // false = not yet in DB
}
