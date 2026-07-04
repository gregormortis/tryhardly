const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface ApiError {
  error: string;
  message?: string;
  details?: unknown;
  // Set by the backend when a payment cannot be authorized because the selected
  // worker has not finished Stripe payout setup. Lets the UI show actionable
  // guidance instead of a generic failure.
  workerPayoutNotReady?: boolean;
}

// Error thrown by the API client on a non-2xx response. Carries the structured
// fields from the JSON body so callers can surface the backend's actionable
// `message` (not just the terse `error` label) and branch on things like
// `workerPayoutNotReady`.
export class ApiRequestError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  workerPayoutNotReady?: boolean;

  constructor(status: number, body: ApiError) {
    super(body.message || body.error || 'Request failed');
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = body.error;
    this.details = body.details;
    this.workerPayoutNotReady = body.workerPayoutNotReady;
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const body: ApiError = await response.json().catch(() => ({
      error: 'Request failed',
    }));
    // Prefer the descriptive `message` over the terse `error` label so the UI
    // shows the backend's actionable guidance instead of a generic "Bad Request".
    throw new ApiRequestError(response.status, body);
  }

  // 204 No Content (and other empty bodies) have nothing to parse.
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get<T>(endpoint: string): Promise<T> {
    return apiRequest<T>(endpoint);
  },

  post<T>(endpoint: string, data: unknown): Promise<T> {
    return apiRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  put<T>(endpoint: string, data: unknown): Promise<T> {
    return apiRequest<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete<T>(endpoint: string): Promise<T> {
    return apiRequest<T>(endpoint, {
      method: 'DELETE',
    });
  },

  request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return apiRequest<T>(endpoint, options);
  },
};
