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
    set((state) => {
      if (
        state.currentIndex === 0 &&
        state.eventIds.length === 1 &&
        state.eventIds[0] === initialEventId
      ) {
        return state;
      }

      return {
        eventIds: [initialEventId],
        currentIndex: 0,
      };
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
    set((state) => {
      const nextIndex = Math.max(0, Math.min(index, state.eventIds.length - 1));
      if (nextIndex === state.currentIndex) {
        return state;
      }

      return {
        currentIndex: nextIndex,
      };
    }),
  reset: () =>
    set((state) => {
      if (state.eventIds.length === 0 && state.currentIndex === 0) {
        return state;
      }

      return {
        eventIds: [],
        currentIndex: 0,
      };
    }),
}));
