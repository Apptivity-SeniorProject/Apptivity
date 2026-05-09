import { create } from 'zustand';

import type { AuthUser } from '@/src/types/auth';

interface UserState {
  profile: AuthUser | null;
  setProfile: (profile: AuthUser | null) => void;
  clearProfile: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null }),
}));
