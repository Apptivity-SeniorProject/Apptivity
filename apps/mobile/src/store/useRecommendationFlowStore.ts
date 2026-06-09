import { create } from 'zustand';

interface RecommendationFlowState {
  eventIds: string[];
  currentIndex: number;
  startSession: (initialEventId: string) => void;
  appendEvent: (eventId: string) => void;
  setCurrentIndex: (index: number) => void;
  reset: () => void;
}

export const useRecommendationFlowStore = create<RecommendationFlowState>((set) => ({
  eventIds: [],
  currentIndex: 0,
  startSession: (initialEventId) =>
    set({
      eventIds: [initialEventId],
      currentIndex: 0,
    }),
  appendEvent: (eventId) =>
    set((state) => {
      if (state.eventIds[state.eventIds.length - 1] === eventId) {
        return state;
      }

      if (state.eventIds.includes(eventId)) {
        return {
          eventIds: state.eventIds,
          currentIndex: state.eventIds.indexOf(eventId),
        };
      }

      return {
        eventIds: [...state.eventIds, eventId],
        currentIndex: state.eventIds.length,
      };
    }),
  setCurrentIndex: (index) =>
    set((state) => ({
      currentIndex: Math.max(0, Math.min(index, state.eventIds.length - 1)),
    })),
  reset: () =>
    set({
      eventIds: [],
      currentIndex: 0,
    }),
}));
