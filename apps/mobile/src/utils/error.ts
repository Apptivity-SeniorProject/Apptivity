import { isAxiosError } from 'axios';

import { ERROR_CODE_MESSAGES } from '@/src/constants/error-codes';
import type { ApiEnvelope, ApiErrorResponse } from '@/src/types/api';

const DEFAULT_ERROR_MESSAGE = 'Bir hata oluştu. Lütfen tekrar deneyin.';

interface EnvelopeLike {
  errors?: { code?: string; message?: string }[];
}

function getCodeMessage(code?: string): string | null {
  if (!code) {
    return null;
  }
  return ERROR_CODE_MESSAGES[code] ?? null;
}

export function getApiErrorMessage(error: unknown, fallback = DEFAULT_ERROR_MESSAGE): string {
  if (!isAxiosError<ApiErrorResponse | ApiEnvelope<unknown> | EnvelopeLike>(error)) {
    return fallback;
  }

  const data = error.response?.data;
  if (!data) {
    return fallback;
  }

  const directCodeMessage = getCodeMessage((data as ApiErrorResponse).errorCode);
  if (directCodeMessage) {
    return directCodeMessage;
  }

  const directMessage = (data as ApiErrorResponse).message;
  if (directMessage) {
    return directMessage;
  }

  const firstError = (data as EnvelopeLike).errors?.[0];
  const envelopeCodeMessage = getCodeMessage(firstError?.code);
  if (envelopeCodeMessage) {
    return envelopeCodeMessage;
  }

  if (firstError?.message) {
    return firstError.message;
  }

  return fallback;
}
