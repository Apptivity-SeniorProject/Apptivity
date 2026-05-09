import { apiClient } from '@/src/api/apiClient';
import type { ApiEnvelope } from '@/src/types/api';
import type { ReportRequest } from '@/src/types/report';

function unwrapEnvelope<T>(responseData: ApiEnvelope<T>): T {
  if (responseData.isSuccess && responseData.data) {
    return responseData.data;
  }

  throw new Error(responseData.errors?.[0]?.message ?? 'Istek basarisiz.');
}

export async function createReport(payload: ReportRequest): Promise<void> {
  const response = await apiClient.post<ApiEnvelope<{ id: string }>>('/api/reports', payload);
  unwrapEnvelope(response.data);
}
