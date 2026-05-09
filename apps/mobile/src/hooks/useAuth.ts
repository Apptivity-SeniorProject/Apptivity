import { useAuthStore } from '@/src/store/useAuthStore';

export function useAuth() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);

  return {
    accessToken,
    refreshToken,
    user,
    hasHydrated,
    isAuthenticated: Boolean(accessToken),
    setTokens,
    setUser,
    logout,
  };
}
