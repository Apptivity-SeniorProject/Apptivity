import { apiClient } from '@/src/api/apiClient';
import type { ApiEnvelope } from '@/src/types/api';
import type { ReportImageAsset, ReportRequest } from '@/src/types/report';

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

const SUPPORTED_EXTENSIONS = new Set(['jpg', 'png', 'webp']);

function normalizeReportFileMeta(asset: ReportImageAsset): { fileName: string; mimeType: string } {
  const rawFileName = (asset.fileName ?? '').toLowerCase();
  const rawMimeType = (asset.mimeType ?? '').toLowerCase();
  const extensionFromFileName = rawFileName.includes('.') ? rawFileName.split('.').pop() ?? '' : '';

  let extension = '';

  if (rawMimeType.includes('png')) extension = 'png';
  else if (rawMimeType.includes('webp')) extension = 'webp';
  else if (rawMimeType.includes('jpeg') || rawMimeType.includes('jpg')) extension = 'jpg';
  else if (SUPPORTED_EXTENSIONS.has(extensionFromFileName)) extension = extensionFromFileName;
  else extension = 'jpg';

  const mimeType =
    extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';

  return {
    fileName: `report-evidence-${Date.now()}.${extension}`,
    mimeType,
  };
}

export async function uploadReportEvidence(asset: ReportImageAsset): Promise<string | undefined> {
  const normalizedUri = asset.uri.trim();
  if (!normalizedUri) {
    throw new Error('Fotograf URI bos olamaz.');
  }

  const normalizedMeta = normalizeReportFileMeta(asset);
  const formData = new FormData();
  formData.append('file', {
    uri: normalizedUri,
    name: normalizedMeta.fileName,
    type: normalizedMeta.mimeType,
  } as never);

  const response = await apiClient.post<ApiEnvelope<{ imageUrl?: string }>>(
    '/api/images/reports/evidence',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  const payload = unwrapEnvelope(response.data);
  return payload.imageUrl;
}
