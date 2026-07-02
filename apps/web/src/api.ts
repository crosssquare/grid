const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return false;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });
  if (!res.ok) return false;

  const data: AuthResponse = await res.json();
  localStorage.setItem("accessToken", data.accessToken);
  localStorage.setItem("refreshToken", data.refreshToken);
  return true;
}

async function rawRequest(path: string, options: RequestInit): Promise<Response> {
  const token = localStorage.getItem("accessToken");
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
}

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const res = await rawRequest(path, options);

  if (res.status === 401 && !isRetry && localStorage.getItem("refreshToken")) {
    // Coalesce concurrent 401s into a single refresh call rather than one per request.
    refreshInFlight ??= tryRefresh().finally(() => {
      refreshInFlight = null;
    });
    const refreshed = await refreshInFlight;
    if (refreshed) {
      return request<T>(path, options, true);
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.dispatchEvent(new Event("grid:session-expired"));
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(Array.isArray(body.message) ? body.message.join(", ") : body.message, res.status);
  }

  return res.json();
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

export const api = {
  signup: (email: string, password: string, country: string) =>
    request<AuthResponse>("/auth/signup", { method: "POST", body: JSON.stringify({ email, password, country }) }),
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  getMyProfile: () => request<Profile>("/profiles/me"),
  saveMyProfile: (dto: Partial<Profile>) => request<Profile>("/profiles/me", { method: "PUT", body: JSON.stringify(dto) })
};

export interface Profile {
  userId: string;
  displayName: string;
  bio: string | null;
  role: string | null;
  bodyType: string | null;
  age: number | null;
  heightCm: number | null;
  size: string | null;
  healthStatus: string | null;
  smoker: boolean | null;
  dirtyPreference: string | null;
  fistingPreference: string | null;
}
