export interface ApiErrorResponse {
  errorCode?: string;
  message?: string;
}

export interface ApiErrorDetail {
  code?: string;
  message?: string;
}

export interface ApiEnvelope<T> {
  isSuccess: boolean;
  data?: T | null;
  errors?: ApiErrorDetail[];
  timestamp?: string;
  traceId?: string;
}
