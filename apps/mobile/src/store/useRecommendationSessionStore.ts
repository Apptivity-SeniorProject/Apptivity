import { create } from 'zustand';

type RecommendationSessionState = {
  userId: string | null;
  sessionId: string | null;
  seenEventIds: string[];
  nextTagOrder: number | null;
  ensureSession: (userId: string) => string;
  startNewSession: (userId: string) => string;
  trackServedEvent: (eventId: string, nextTagOrder: number | null) => void;
  reset: () => void;
};

function createSessionId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export const useRecommendationSessionStore = create<RecommendationSessionState>((set, get) => ({
  userId: null,
  sessionId: null,
  seenEventIds: [],
  nextTagOrder: null,
  ensureSession: (userId) => {
    const state = get();
    if (state.userId === userId && state.sessionId) {
      return state.sessionId;
    }

    const sessionId = createSessionId();
    set({
      userId,
      sessionId,
      seenEventIds: [],
      nextTagOrder: null,
    });

    return sessionId;
  },
  startNewSession: (userId) => {
    const sessionId = createSessionId();
    set({
      userId,
      sessionId,
      seenEventIds: [],
      nextTagOrder: null,
    });

    return sessionId;
  },
  trackServedEvent: (eventId, nextTagOrder) =>
    set((state) => ({
      seenEventIds: state.seenEventIds.includes(eventId)
        ? state.seenEventIds
        : [...state.seenEventIds, eventId],
      nextTagOrder,
    })),
  reset: () =>
    set({
      userId: null,
      sessionId: null,
      seenEventIds: [],
      nextTagOrder: null,
    }),
}));
