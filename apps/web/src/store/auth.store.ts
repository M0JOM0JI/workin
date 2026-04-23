import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
}

export interface StoreItem {
  id: string;      // StoreStaff.id
  storeId: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  store: {
    id: string;
    name: string;
    businessOwner?: string | null;
    businessNumber?: string | null;
    address?: string | null;
    phone?: string | null;
    mobilePhone?: string | null;
    category?: string | null;
  };
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  stores: StoreItem[];
  currentStoreId: string | null;

  setAuth: (user: User, token: string) => void;
  setStores: (stores: StoreItem[]) => void;
  setCurrentStoreId: (storeId: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      stores: [],
      currentStoreId: null,

      setAuth: (user, accessToken) => set({ user, accessToken }),
      setStores: (stores) =>
        set((s) => ({
          stores,
          currentStoreId: s.currentStoreId ?? stores[0]?.store.id ?? null,
        })),
      setCurrentStoreId: (storeId) => set({ currentStoreId: storeId }),
      clearAuth: () => set({ user: null, accessToken: null, stores: [], currentStoreId: null }),
    }),
    { name: 'workin-auth' },
  ),
);
