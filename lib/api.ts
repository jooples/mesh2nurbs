/**
 * Shared API client for the mesh2nurbs frontend.
 *
 * All calls to the FastAPI backend flow through this module.
 * JWT tokens are stored in localStorage and attached automatically.
 * On 401 responses, tokens are cleared and the user is redirected to login.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

// ── Token helpers ──

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}

function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

// ── Fetch wrapper ──

class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(`API error ${status}: ${JSON.stringify(detail)}`);
    this.status = status;
    this.detail = detail;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  // Only set Content-Type for requests with a body (not FormData)
  const method = (options.method || "GET").toUpperCase();
  if (!["GET", "HEAD", "DELETE"].includes(method) && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (authenticated) {
    const token = getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  let res = await fetch(url, { ...options, headers });

  // Token refresh on 401
  if (res.status === 401 && authenticated) {
    const refresh = getRefreshToken();
    if (refresh) {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setTokens(data.access_token, data.refresh_token);
        headers["Authorization"] = `Bearer ${data.access_token}`;
        res = await fetch(url, { ...options, headers });
      } else {
        clearTokens();
        window.location.href = "/login";
        throw new ApiError(401, "Session expired");
      }
    } else {
      clearTokens();
      window.location.href = "/login";
      throw new ApiError(401, "Not authenticated");
    }
  }

  if (!res.ok) {
    const detail = await res.json().catch(() => res.statusText);
    throw new ApiError(res.status, detail);
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

// ── Auth API ──

export type User = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  email_verified: boolean;
  is_active: boolean;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

export const authApi = {
  async register(email: string, password: string, displayName?: string): Promise<TokenResponse> {
    const data = await apiFetch<TokenResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, display_name: displayName }),
    }, false);
    setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async login(email: string, password: string): Promise<TokenResponse> {
    const data = await apiFetch<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }, false);
    setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async logout() {
    clearTokens();
    window.location.href = "/";
  },

  async getMe(): Promise<User | null> {
    try {
      return await apiFetch<User>("/auth/me");
    } catch {
      return null;
    }
  },

  async updateMe(data: { display_name?: string; avatar_url?: string }): Promise<User> {
    return apiFetch<User>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  isAuthenticated(): boolean {
    return !!getAccessToken();
  },
};

// ── Jobs API ──

export type TextTo3DParams = {
  prompt: string;
  enable_pbr?: boolean;
  face_count?: number;
  generate_type?: string;
  polygon_type?: string;
  model?: string;
  alpha?: number;
  offset?: number;
  auto_post_process?: boolean;
};

export type JobResponse = {
  id: string;
  status: string;
  job_type: string;
  generation_params: Record<string, unknown>;
  pipeline_definition: Array<{ stage: number; type: string; status: string; operation_id?: string; skip_reason?: string }>;
  created_at: string;
};

export type Artifact = {
  id: string;
  artifact_type: string;
  label: string | null;
  file_size_bytes: number;
  content_type: string | null;
  stage: number;
  download_url: string | null;
  preview_image_url: string | null;
  created_at: string;
};

export type JobDetail = JobResponse & {
  user_id: string;
  title: string | null;
  album: string | null;
  error_message: string | null;
  current_stage: number;
  artifacts: Artifact[];
  is_public: boolean;
  published_at: string | null;
  public_title: string | null;
  publisher_name: string | null;
  submitted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type PublicJobDetail = {
  id: string;
  title: string | null;
  job_type: string;
  publisher_name: string | null;
  generation_params: Record<string, unknown>;
  artifacts: Artifact[];
  published_at: string | null;
  created_at: string;
};

export type JobSummary = {
  id: string;
  job_type: string;
  status: string;
  title: string | null;
  album: string | null;
  external_job_id: string | null;
  created_at: string;
  glb_url: string | null;
  preview_image_url: string | null;
  is_public: boolean;
  publisher_name: string | null;
};

export type EstimateResponse = {
  generation_estimated_seconds: number | null;
  generation_sample_size: number;
  post_process_estimated_seconds: number | null;
  post_process_sample_size: number;
  post_process_failure_rate: number | null;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export const jobsApi = {
  async createTextTo3D(params: TextTo3DParams, requestKey?: string): Promise<JobResponse> {
    return apiFetch<JobResponse>("/jobs/text-to-3d", {
      method: "POST",
      headers: requestKey ? { "Idempotency-Key": requestKey } : {},
      body: JSON.stringify({ params }),
    });
  },

  async createImageTo3D(
    imageFile: File,
    params?: Partial<TextTo3DParams>,
    requestKey?: string
  ): Promise<JobResponse> {
    const formData = new FormData();
    formData.append("image", imageFile);
    if (params?.prompt) formData.append("prompt", params.prompt);
    if (params?.enable_pbr !== undefined) formData.append("enable_pbr", String(params.enable_pbr));
    if (params?.face_count) formData.append("face_count", String(params.face_count));
    if (params?.generate_type) formData.append("generate_type", params.generate_type);
    if (params?.polygon_type) formData.append("polygon_type", params.polygon_type);
    if (params?.model) formData.append("model", params.model);
    if (params?.alpha !== undefined) formData.append("alpha", String(params.alpha));
    if (params?.offset !== undefined) formData.append("offset", String(params.offset));
    if (params?.auto_post_process !== undefined)
      formData.append("auto_post_process", String(params.auto_post_process));

    return apiFetch<JobResponse>("/jobs/image-to-3d", {
      method: "POST",
      headers: requestKey ? { "Idempotency-Key": requestKey } : {},
      body: formData,
    });
  },

  async getJob(jobId: string): Promise<JobDetail> {
    return apiFetch<JobDetail>(`/jobs/${jobId}`);
  },

  async listJobs(params?: {
    page?: number;
    per_page?: number;
    status?: string;
    job_type?: string;
    search?: string;
    album?: string;
    unfiled?: boolean;
  }, signal?: AbortSignal): Promise<PaginatedResponse<JobSummary>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.per_page) searchParams.set("per_page", String(params.per_page));
    if (params?.status) searchParams.set("status", params.status);
    if (params?.job_type) searchParams.set("job_type", params.job_type);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.album) searchParams.set("album", params.album);
    if (params?.unfiled) searchParams.set("unfiled", "true");

    const qs = searchParams.toString();
    return apiFetch<PaginatedResponse<JobSummary>>(`/jobs${qs ? `?${qs}` : ""}`, { signal });
  },

  async listAlbums(signal?: AbortSignal): Promise<{ albums: string[]; has_unsorted: boolean }> {
    return apiFetch("/jobs/albums", { signal });
  },

  async deleteJob(jobId: string): Promise<void> {
    return apiFetch<void>(`/jobs/${jobId}`, { method: "DELETE" });
  },

  async setAlbum(jobId: string, album: string | null): Promise<JobSummary> {
    return apiFetch<JobSummary>(`/jobs/${jobId}/album`, {
      method: "PATCH",
      body: JSON.stringify({ album }),
    });
  },

  // Rough duration estimate from historical data. Null *_estimated_seconds
  // means "not enough history yet" — the caller should show that, not 0.
  async estimateTime(params: {
    job_type: string;
    face_count?: number;
    alpha?: number;
    offset?: number;
  }): Promise<EstimateResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set("job_type", params.job_type);
    if (params.face_count) searchParams.set("face_count", String(params.face_count));
    if (params.alpha !== undefined) searchParams.set("alpha", String(params.alpha));
    if (params.offset !== undefined) searchParams.set("offset", String(params.offset));
    return apiFetch<EstimateResponse>(`/jobs/estimate?${searchParams.toString()}`);
  },

  // Public gallery — no auth required, so pass authenticated=false to skip
  // attaching a token / triggering any login redirect for anonymous visitors.
  async listPublicJobs(params?: {
    page?: number;
    per_page?: number;
    search?: string;
  }, signal?: AbortSignal): Promise<PaginatedResponse<JobSummary>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.per_page) searchParams.set("per_page", String(params.per_page));
    if (params?.search) searchParams.set("search", params.search);

    const qs = searchParams.toString();
    return apiFetch<PaginatedResponse<JobSummary>>(
      `/jobs/public${qs ? `?${qs}` : ""}`,
      { signal },
      false
    );
  },

  async getPublicJob(jobId: string): Promise<PublicJobDetail> {
    return apiFetch<PublicJobDetail>(`/jobs/public/${jobId}`, {}, false);
  },

  async setPublished(
    jobId: string,
    isPublic: boolean,
    opts?: { publicTitle?: string; publisherName?: string }
  ): Promise<{
    id: string;
    is_public: boolean;
    published_at: string | null;
    public_title: string | null;
    publisher_name: string | null;
  }> {
    return apiFetch(`/jobs/${jobId}/publish`, {
      method: "PATCH",
      body: JSON.stringify({
        is_public: isPublic,
        public_title: opts?.publicTitle,
        publisher_name: opts?.publisherName,
      }),
    });
  },

  // Trigger (or re-trigger) post-processing. Omit alpha/offset to reuse the
  // job's last-used values; pass them to regenerate NURBS output from the
  // same source mesh with different alpha_wrap parameters.
  async postProcess(
    jobId: string,
    overrides?: { alpha?: number; offset?: number },
    requestKey?: string
  ): Promise<{ job_id: string; status: string; alpha: number; offset: number; message: string }> {
    return apiFetch(`/jobs/${jobId}/post-process`, {
      method: "POST",
      headers: requestKey ? { "Idempotency-Key": requestKey } : {},
      body: JSON.stringify(overrides ?? {}),
    });
  },
};

// ── Credits API ──

export type CreditCapabilities = {
  self_service_topup_enabled: boolean;
  generation_cost: number;
  post_process_cost: number;
  initial_credits: number;
};

export const creditsApi = {
  async getCapabilities(signal?: AbortSignal): Promise<CreditCapabilities> {
    return apiFetch("/credits/capabilities", { signal });
  },
  async getBalance(): Promise<{ balance: number; total_balance: number; reserved_balance: number; lifetime_used: number }> {
    return apiFetch("/credits/balance");
  },

  // The server only enables this for explicitly configured local testing.
  async topUp(amount: number, requestKey?: string): Promise<{ balance: number }> {
    return apiFetch("/credits/topup", {
      method: "POST",
      headers: requestKey ? { "Idempotency-Key": requestKey } : {},
      body: JSON.stringify({ amount }),
    });
  },
};

// ── Reports API ──

export type IssueReport = {
  id: string;
  category: string;
  title: string;
  description: string;
  page_url: string | null;
  status: string;
  created_at: string;
};

export const reportsApi = {
  async create(data: {
    category: string;
    title: string;
    description: string;
    page_url?: string;
  }): Promise<IssueReport> {
    return apiFetch<IssueReport>("/reports", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// ── Admin API ──

export type AdminUserItem = {
  id: string;
  email: string;
  display_name: string | null;
  is_admin: boolean;
  is_active: boolean;
  credits_balance: number;
  lifetime_used: number;
  total_jobs: number;
  completed_jobs: number;
  created_at: string | null;
};

export type AdminUserDetail = AdminUserItem & {
  email_verified: boolean;
  last_login_at: string | null;
};

export type AdminStats = {
  total_users: number;
  active_users: number;
  admin_users: number;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  total_credits_granted: number;
  total_credits_consumed: number;
};

export type CreditTransactionItem = {
  id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  created_at: string | null;
};

export type AdminReportItem = {
  id: string;
  category: string;
  title: string;
  description: string;
  page_url: string | null;
  status: string;
  admin_note: string | null;
  reporter_email: string;
  created_at: string | null;
};

export const adminApi = {
  async getStats(): Promise<AdminStats> {
    return apiFetch<AdminStats>("/admin/stats");
  },

  async listUsers(params?: {
    search?: string;
    page?: number;
    per_page?: number;
  }): Promise<PaginatedResponse<AdminUserItem>> {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.per_page) sp.set("per_page", String(params.per_page));
    const qs = sp.toString();
    return apiFetch<PaginatedResponse<AdminUserItem>>(
      `/admin/users${qs ? `?${qs}` : ""}`
    );
  },

  async getUser(userId: string): Promise<AdminUserDetail> {
    return apiFetch<AdminUserDetail>(`/admin/users/${userId}`);
  },

  async adjustCredits(
    userId: string,
    amount: number,
    reason: string,
    requestKey?: string
  ): Promise<{
    message: string;
    user_id: string;
    previous_balance: number;
    new_balance: number;
    adjustment: number;
  }> {
    return apiFetch(`/admin/users/${userId}/credits`, {
      method: "POST",
      headers: requestKey ? { "Idempotency-Key": requestKey } : {},
      body: JSON.stringify({ amount, reason }),
    });
  },

  async getUserTransactions(
    userId: string,
    params?: { page?: number; per_page?: number }
  ): Promise<PaginatedResponse<CreditTransactionItem>> {
    const sp = new URLSearchParams();
    if (params?.page) sp.set("page", String(params.page));
    if (params?.per_page) sp.set("per_page", String(params.per_page));
    const qs = sp.toString();
    return apiFetch<PaginatedResponse<CreditTransactionItem>>(
      `/admin/users/${userId}/transactions${qs ? `?${qs}` : ""}`
    );
  },

  async listReports(params?: {
    status?: string;
    page?: number;
    per_page?: number;
  }): Promise<PaginatedResponse<AdminReportItem>> {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.per_page) sp.set("per_page", String(params.per_page));
    const qs = sp.toString();
    return apiFetch<PaginatedResponse<AdminReportItem>>(
      `/admin/reports${qs ? `?${qs}` : ""}`
    );
  },

  async updateReport(
    reportId: string,
    data: { status?: string; admin_note?: string }
  ): Promise<AdminReportItem> {
    return apiFetch<AdminReportItem>(`/admin/reports/${reportId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};

export { apiFetch, ApiError, getAccessToken, setTokens, clearTokens, API_BASE };
