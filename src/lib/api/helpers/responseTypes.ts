/**
 * Common API Response Types
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  metadata: {
    total: number;
    page?: number;
    pageSize?: number;
  };
}

export interface CountResponse extends ApiResponse<{ count: number }> {}
