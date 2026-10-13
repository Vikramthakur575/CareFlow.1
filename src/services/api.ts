import { Doctor, Appointment, TimeSlot, AdminMetrics, User } from '../types/index.ts';

const TOKEN_KEY = 'careflow_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage = data?.error || data?.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMessage) as any;
    error.status = response.status;
    error.details = data?.details;
    throw error;
  }

  return data as T;
}

// 1. Auth API
export const authApi = {
  login: (email: string, password: string) =>
    request<{ message: string; user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string, phone?: string) =>
    request<{ message: string; user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone }),
    }),

  logout: () =>
    request<{ message: string }>('/api/auth/logout', {
      method: 'POST',
    }),

  me: () =>
    request<{ user: User }>('/api/auth/me'),
};

// 2. Doctor API
export const doctorApi = {
  list: (params?: { search?: string; specialty?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.specialty && params.specialty !== 'All') query.set('specialty', params.specialty);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request<{ doctors: Doctor[] }>(`/api/doctors${queryString}`);
  },

  get: (id: number) =>
    request<{ doctor: Doctor }>(`/api/doctors/${id}`),

  getSlots: (id: number, date: string) =>
    request<{ doctorId: number; date: string; slots: TimeSlot[] }>(`/api/doctors/${id}/slots?date=${date}`),
};

// 3. Appointment API
export const appointmentApi = {
  create: (data: { doctorId: number; appointmentDate: string; startTime: string; reason?: string }) =>
    request<{ message: string; appointment: Appointment }>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listMine: () =>
    request<{ appointments: Appointment[] }>('/api/appointments/my'),

  get: (id: number) =>
    request<{ appointment: Appointment }>(`/api/appointments/${id}`),

  cancel: (id: number) =>
    request<{ message: string; appointment: Partial<Appointment> }>(`/api/appointments/${id}/cancel`, {
      method: 'PATCH',
    }),
};

// 4. Admin API
export const adminApi = {
  getStats: () =>
    request<{ stats: AdminMetrics }>('/api/admin/stats'),

  listAppointments: (filters?: { status?: string; doctorId?: number; date?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (filters?.status) query.set('status', filters.status);
    if (filters?.doctorId) query.set('doctorId', String(filters.doctorId));
    if (filters?.date) query.set('date', filters.date);
    if (filters?.search) query.set('search', filters.search);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request<{ appointments: Appointment[] }>(`/api/admin/appointments${queryString}`);
  },

  updateStatus: (id: number, status: 'booked' | 'completed' | 'cancelled' | 'no_show') =>
    request<{ message: string; appointment: Partial<Appointment> }>(`/api/admin/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  createDoctor: (data: {
    name: string;
    specialty: string;
    experienceYears: number;
    consultationFee: number;
    bio?: string;
    location?: string;
    avatarUrl?: string;
  }) =>
    request<{ message: string; doctor: Doctor }>('/api/admin/doctors', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  toggleDoctor: (id: number, isActive: boolean) =>
    request<{ message: string; doctor: Doctor }>(`/api/admin/doctors/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),
};
