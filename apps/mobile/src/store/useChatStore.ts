import { create } from 'zustand';

interface ChatState {
  activeEventId: string | null;
  unreadByEvent: Record<string, number>;
  setActiveEvent: (eventId: string | null) => void;
  incrementUnread: (eventId: string) => void;
  clearUnread: (eventId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeEventId: null,
  unreadByEvent: {},
  setActiveEvent: (eventId) => set({ activeEventId: eventId }),
  incrementUnread: (eventId) =>
    set((state) => {
      const current = state.unreadByEvent[eventId] ?? 0;
      return {
        unreadByEvent: {
          ...state.unreadByEvent,
          [eventId]: current + 1,
        },
      };
    }),
  clearUnread: (eventId) =>
    set((state) => ({
      unreadByEvent: {
        ...state.unreadByEvent,
        [eventId]: 0,
      },
    })),
}));
