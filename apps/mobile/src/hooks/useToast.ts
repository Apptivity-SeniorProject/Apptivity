import { useToastStore } from '@/src/store/useToastStore';
import { useMemo } from 'react';

export function useToast() {
  const showToast = useToastStore((state) => state.showToast);
  const hideToast = useToastStore((state) => state.hideToast);

  return useMemo(
    () => ({
      success: (message: string, duration?: number) => showToast(message, 'success', duration),
      error: (message: string, duration?: number) => showToast(message, 'error', duration),
      info: (message: string, duration?: number) => showToast(message, 'info', duration),
      hide: hideToast,
    }),
    [hideToast, showToast]
  );
}
