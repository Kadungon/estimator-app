import { create } from "zustand";
import { CartItem } from "../types";
import { v4 as uuidv4 } from "uuid";

interface CartStore {
  estimateId: number | null;
  estNumber: string | null;
  items: CartItem[];
  customer: string;
  customerId: number | null;
  notes: string;
  discount: number;
  amountPaid: number;
  initialPaid: number;

  setEstimateId: (id: number | null) => void;
  addItem: (item: Omit<CartItem, "tempId">) => void;
  removeItem: (tempId: string) => void;
  updateQty: (tempId: string, qty: number) => void;
  updatePrice: (tempId: string, price: number) => void;
  updatePriceLabel: (tempId: string, label: string) => void;
  setCustomer: (v: string) => void;
  setCustomerId: (v: number | null) => void;
  setNotes: (v: string) => void;
  setDiscount: (v: number) => void;
  setAmountPaid: (v: number) => void;
  clearCart: () => void;
  loadEstimate: (estimate: any) => void;

  // Computed
  subtotal: () => number;
  total: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  estimateId: null,
  estNumber: null,
  items: [],
  customer: "",
  customerId: null,
  notes: "",
  discount: 0,
  amountPaid: 0,
  initialPaid: 0,

  setEstimateId: (id) => set({ estimateId: id }),

  addItem: (item) =>
    set((s) => ({ items: [...s.items, { ...item, tempId: uuidv4() }] })),

  loadEstimate: (est) =>
    set({
      estimateId: est.id,
      estNumber: est.est_number || null,
      customer: est.customer || "",
      customerId: est.customer_id || null,
      notes: est.notes || "",
      discount: est.discount,
      amountPaid: est.amount_paid || 0,
      initialPaid: est.amount_paid || 0,
      items: est.items.map((i: any) => ({
        tempId: uuidv4(),
        item_id: i.item_id,
        name: i.name,
        unit: i.unit,
        price_label: i.price_label,
        unit_price: i.unit_price,
        quantity: i.quantity,
        persisted: true,
      })),
    }),


  removeItem: (tempId) =>
    set((s) => ({ items: s.items.filter((i) => i.tempId !== tempId) })),

  updateQty: (tempId, qty) =>
    set((s) => ({
      items: s.items.map((i) => (i.tempId === tempId ? { ...i, quantity: qty } : i)),
    })),

  updatePrice: (tempId, price) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.tempId === tempId ? { ...i, unit_price: price } : i
      ),
    })),

  updatePriceLabel: (tempId, label) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.tempId === tempId ? { ...i, price_label: label } : i
      ),
    })),

  setCustomer: (customer) => set({ customer }),
  setCustomerId: (customerId) => set({ customerId }),
  setNotes: (notes) => set({ notes }),
  setDiscount: (discount) => set({ discount }),
  setAmountPaid: (amountPaid) => set({ amountPaid }),

  clearCart: () => set({ 
    estimateId: null, 
    estNumber: null,
    items: [], 
    customer: "", 
    customerId: null, 
    notes: "", 
    discount: 0, 
    amountPaid: 0,
    initialPaid: 0
  }),

  subtotal: () => get().items.reduce((s, i) => s + i.unit_price * i.quantity, 0),
  total: () => {
    const st = get().subtotal();
    return Math.max(0, st - get().discount);
  },
}));
