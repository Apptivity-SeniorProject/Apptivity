import { create } from 'zustand';

const DEFAULT_ERROR_TITLE = 'Bir sorun oluştu';

interface ErrorModalState {
  visible: boolean;
  title: string;
  message: string;
  showError: (message: string, title?: string) => void;
  hideError: () => void;
}

export const useErrorModalStore = create<ErrorModalState>((set) => ({
  visible: false,
  title: DEFAULT_ERROR_TITLE,
  message: '',
  showError: (message, title = DEFAULT_ERROR_TITLE) => {
    set({
      visible: true,
      title,
      message,
    });
  },
  hideError: () => {
    set({
      visible: false,
      title: DEFAULT_ERROR_TITLE,
      message: '',
    });
  },
}));
