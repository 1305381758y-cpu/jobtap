export type AdminRole = 'owner' | 'operator';
export type AdminStatus = 'active' | 'disabled';
export type JobStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'removed';
export type JobSource = 'employer_submitted' | 'admin_created';

export type AdminUser = {
  id: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
};

export type Job = {
  id: string;
  title: string;
  employerName: string;
  countryCode: string;
  city?: string | null;
  isRemote: boolean;
  salaryText: string;
  workTimeText: string;
  description: string;
  contactUrl: string;
  status: JobStatus;
  source: JobSource;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | null;
  publishedAt?: string | null;
};

export type StatisticsItem = {
  countryCode: string;
  jobId: string;
  activeUsers: number;
  detailViews: number;
  contactClicks: number;
  contactClickRate: number | null;
};

export type JobPayload = {
  title: string;
  employerName: string;
  countryCode: string;
  city?: string;
  isRemote: boolean;
  salaryText: string;
  workTimeText: string;
  description: string;
  contactUrl: string;
  status?: JobStatus;
};

export type EmployerJobPayload = Omit<JobPayload, 'status'> & {
  website?: string;
};

export type AdminPayload = {
  email: string;
  password: string;
  role: AdminRole;
  status: AdminStatus;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    if (token && response.status === 401) {
      window.dispatchEvent(new CustomEvent('jobtap:unauthorized'));
    }
    throw new ApiError(response.status, body?.message ?? '请求失败');
  }

  return body as T;
}

export function login(email: string, password: string) {
  return request<{ accessToken: string }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function listJobs(token: string, filters: Record<string, string>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return request<Job[]>(`/api/admin/jobs${query ? `?${query}` : ''}`, {}, token);
}

export function createJob(token: string, payload: JobPayload) {
  return request<Job>('/api/admin/jobs', { method: 'POST', body: JSON.stringify(payload) }, token);
}

export function submitEmployerJob(payload: EmployerJobPayload) {
  return request<Job>('/api/employer/jobs', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateJob(token: string, id: string, payload: Partial<JobPayload>) {
  return request<Job>(`/api/admin/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }, token);
}

export function approveJob(token: string, id: string) {
  return request<Job>(`/api/admin/jobs/${id}/approve`, { method: 'POST' }, token);
}

export function rejectJob(token: string, id: string, rejectionReason: string) {
  return request<Job>(
    `/api/admin/jobs/${id}/reject`,
    { method: 'POST', body: JSON.stringify({ rejectionReason }) },
    token,
  );
}

export function removeJob(token: string, id: string) {
  return request<Job>(`/api/admin/jobs/${id}/remove`, { method: 'POST' }, token);
}

export function getStatistics(token: string, filters: Record<string, string>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return request<{ items: StatisticsItem[] }>(`/api/admin/statistics${query ? `?${query}` : ''}`, {}, token);
}

export function listAdmins(token: string) {
  return request<AdminUser[]>('/api/admin/users', {}, token);
}

export function createAdmin(token: string, payload: AdminPayload) {
  return request<AdminUser>('/api/admin/users', { method: 'POST', body: JSON.stringify(payload) }, token);
}

export function updateAdmin(token: string, id: string, payload: Partial<Pick<AdminUser, 'role' | 'status'>>) {
  return request<AdminUser>(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }, token);
}
