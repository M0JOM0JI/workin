import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  currentStoreId: string | null;
  isLoaded: boolean;

  setAuth: (user: User, token: string) => Promise<void>;
  setCurrentStoreId: (storeId: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  currentStoreId: null,
  isLoaded: false,

  setAuth: async (user, accessToken) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    set({ user, accessToken });
  },

  setCurrentStoreId: async (storeId) => {
    await SecureStore.setItemAsync('currentStoreId', storeId);
    set({ currentStoreId: storeId });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync('currentStoreId');
    set({ user: null, accessToken: null, currentStoreId: null });
  },

  loadFromStorage: async () => {
    try {
      const [token, userStr, storeId] = await Promise.all([
        SecureStore.getItemAsync('accessToken'),
        SecureStore.getItemAsync('user'),
        SecureStore.getItemAsync('currentStoreId'),
      ]);
      if (token && userStr) {
        set({
          accessToken: token,
          user: JSON.parse(userStr),
          currentStoreId: storeId ?? null,
        });
      }
    } catch {
      // 무시
    } finally {
      set({ isLoaded: true });
    }
  },
}));
