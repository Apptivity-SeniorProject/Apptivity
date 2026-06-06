import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitReview, SubmitReviewPayload } from '../api/reviewService';
import { Alert } from 'react-native';

export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SubmitReviewPayload) => submitReview(payload),
    onSuccess: (_, variables) => {
      // Invalidate the event-participants query so the UI can hide the voting slider (isVoted will become true)
      queryClient.invalidateQueries({ queryKey: ['event-participants', variables.eventId] });
    },
    onError: (error: any) => {
      console.error('Failed to submit review:', error);
      Alert.alert('Hata', error?.response?.data?.errors?.[0]?.message || 'Oy verilirken bir hata oluştu.');
    },
  });
}
