/**
 * Central API Client configuration for The India Frames frontend.
 * Reads NEXT_PUBLIC_API_BASE_URL safely with fallback for local development.
 * Normalizes FastAPI HTTPException `{ detail }` responses into `ApiResponse.error`.
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

  let parsed: Record<string, unknown> = {};
  try {
    parsed = (await response.json()) as Record<string, unknown>;
  } catch {
    parsed = {};
  }

  if (!response.ok) {
    if (parsed.error && typeof parsed.error === "object") {
      return parsed as unknown as ApiResponse<T>;
    }
    const detail =
      typeof parsed.detail === "string"
        ? parsed.detail
        : Array.isArray(parsed.detail) && parsed.detail.length > 0
        ? String(
            (parsed.detail[0] as { msg?: string })?.msg ??
              "Validation error."
          )
        : response.statusText || "Request failed.";

    return {
      error: {
        code: `HTTP_${response.status}`,
        message: detail,
      },
    };
  }

  return parsed as unknown as ApiResponse<T>;
}
