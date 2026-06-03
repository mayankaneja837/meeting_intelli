export type ApiSuccess<T> = {
  success: true;
  data: T;
  traceId: string;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  traceId: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Convenience type for Next.js route handlers that return paginated data
export type PaginatedData<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};