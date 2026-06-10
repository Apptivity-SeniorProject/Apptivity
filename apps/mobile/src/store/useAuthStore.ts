import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { useRecommendationFlowStore } from '@/src/store/useRecommendationFlowStore';
import { useRecommendationSessionStore } from '@/src/store/useRecommendationSessionStore';
import type { AuthTokens, AuthUser } from '@/src/types/auth';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  hasHydrated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser | null) => void;
  authenticate: (payload: AuthTokens & { user: AuthUser }) => void;
  logout: () => void;
  setHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      hasHydrated: false,
      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
      },
      setUser: (user) => {
        set({ user });
      },
      authenticate: ({ accessToken, refreshToken, user }) => {
        set({ accessToken, refreshToken, user });
      },
      logout: () => {
        useRecommendationFlowStore.getState().reset();
        useRecommendationSessionStore.getState().reset();
        set({ accessToken: null, refreshToken: null, user: null });
      },
      setHydrated: (value) => {
        set({ hasHydrated: value });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
