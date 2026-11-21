import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartCustomPhoto {
  assetId: string;
  originalFilename: string;
  previewDataUrl: string;
  editSummary: string;
}

export interface CartItem {
  cartLineKey?: string;
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  variantLabel: string;
  imageUrl?: string;
  retailPricePaise: number;
  wholesalePricePaise?: number;
  wholesaleMoq: number;
  quantity: number;
  customPhoto?: CartCustomPhoto;
}

export function getCartLineKey(
  item: Pick<CartItem, "cartLineKey" | "variantId" | "customPhoto">
): string {
  if (item.cartLineKey) return item.cartLineKey;
  if (item.customPhoto?.assetId) {
    return `${item.variantId}::${item.customPhoto.assetId}`;
  }
  return item.variantId;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  removeItem: (lineKey: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, quantity = 1) => {
        const lineKey = getCartLineKey(item);
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => getCartLineKey(i) === lineKey
          );

          if (existingIndex > -1) {
            const updatedItems = [...state.items];
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              quantity: updatedItems[existingIndex].quantity + quantity,
            };
            return { items: updatedItems };
          }

          return {
            items: [...state.items, { ...item, cartLineKey: lineKey, quantity }],
          };
        });
      },

      updateQuantity: (lineKey, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((i) => getCartLineKey(i) !== lineKey),
            };
          }
          return {
            items: state.items.map((i) =>
              getCartLineKey(i) === lineKey ? { ...i, quantity } : i
            ),
          };
        });
      },

      removeItem: (lineKey) => {
        set((state) => ({
          items: state.items.filter((i) => getCartLineKey(i) !== lineKey),
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: "the_india_frames_cart",
    }
  )
);
