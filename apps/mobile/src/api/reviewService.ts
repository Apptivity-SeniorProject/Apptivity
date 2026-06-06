import { apiClient } from './apiClient';

export interface SubmitReviewPayload {
  reviewedAccountId: string;
  eventId: string;
  rating: number;
  comment?: string | null;
}

export async function submitReview(payload: SubmitReviewPayload): Promise<void> {
  await apiClient.post('/api/reviews', payload);
}
