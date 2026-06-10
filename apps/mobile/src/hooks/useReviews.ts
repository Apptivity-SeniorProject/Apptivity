import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitReview, SubmitReviewPayload } from '../api/reviewService';

import { useToast } from '@/src/hooks/useToast';
import { getApiErrorMessage } from '@/src/utils/error';

export function useSubmitReview() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: SubmitReviewPayload) => submitReview(payload),
    onSuccess: (_, variables) => {
      // Invalidate the event-participants query so the UI can hide the voting slider (isVoted will become true)
      queryClient.invalidateQueries({ queryKey: ['event-participants', variables.eventId] });
    },
    onError: (error: any) => {
      console.error('Failed to submit review:', error);
      toast.error(getApiErrorMessage(error, 'Oy verilirken bir hata oluştu.'));
    },
  });
}
