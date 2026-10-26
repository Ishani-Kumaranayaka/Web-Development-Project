import axios, { type AxiosError } from 'axios'
import type { ApiResponse, BookingStatus, PaymentStatus, User } from '../types'

export interface AuthResult {
  user: User
  token: string
}

export interface ApiHealth {
  status: 'ok'
  databaseConfigured: boolean
}

const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api', timeout: 8000 })

client.interceptors.request.use(config => {
  const token = localStorage.getItem('tm-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const api = {
  async health(): Promise<ApiHealth> {
    const response = await client.get<ApiHealth>('/health')
    return response.data
  },
  async login(input: { email: string; password: string }): Promise<ApiResponse<AuthResult>> {
    const response = await client.post<ApiResponse<AuthResult>>('/auth/login', input)
    return response.data
  },
  async register(input: { name: string; email: string; password: string }): Promise<ApiResponse<AuthResult>> {
    const response = await client.post<ApiResponse<AuthResult>>('/auth/register', input)
    return response.data
  },
  async updateBookingPaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<void> {
    await client.patch(`/bookings/${id}/payment-status`, { paymentStatus: paymentStatus.toUpperCase() })
  },
  async updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
    await client.patch(`/bookings/${id}/status`, { status: status.toUpperCase() })
  },
  setToken(token: string | null): void {
    if (token) localStorage.setItem('tm-token', token)
    else localStorage.removeItem('tm-token')
  },
  getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const serverMessage = error.response?.data?.message;

    if (typeof serverMessage === 'string') {
      return serverMessage;
    }

    if (error.code === 'ECONNABORTED') {
      return 'The server took too long to respond. Please try again.';
    }

    if (!error.response) {
      return 'Cannot reach the server. Please check that it is running.';
    }

    return 'The request failed. Please try again.';
  }

  return 'An unexpected error occurred. Please try again.';
},
}