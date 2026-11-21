/**
 * Central API Client configuration for The India Frames frontend.
 * Reads NEXT_PUBLIC_API_BASE_URL safely with fallback for local development.
 */

const DEFAULT_API_BASE_URL = "http://localhost:8000/api/v1";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;

export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field?: string; issue: string }>;
  };
  meta?: {
    request_id?: string;
    timestamp?: string;
  };
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: options.credentials ?? "include",
  });

  const data = await response.json();
  return data as ApiResponse<T>;
}
