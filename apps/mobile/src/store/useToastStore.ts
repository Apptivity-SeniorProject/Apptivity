import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  duration: number;
  timer: ReturnType<typeof setTimeout> | null;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  visible: false,
  message: '',
  type: 'info',
  duration: 2400,
  timer: null,
  showToast: (message, type = 'info', duration = 2400) => {
    const currentTimer = get().timer;
    if (currentTimer) {
      clearTimeout(currentTimer);
    }

    const timer = setTimeout(() => {
      set({ visible: false, timer: null });
    }, duration);

    set({
      visible: true,
      message,
      type,
      duration,
      timer,
    });
  },
  hideToast: () => {
    const currentTimer = get().timer;
    if (currentTimer) {
      clearTimeout(currentTimer);
    }

    set({ visible: false, timer: null });
  },
}));
