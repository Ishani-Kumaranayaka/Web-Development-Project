import axios, { type AxiosError } from 'axios'
import type { ApiResponse, User } from '../types'

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
  setToken(token: string | null): void {
    if (token) localStorage.setItem('tm-token', token)
    else localStorage.removeItem('tm-token')
  },
  getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>
      return axiosError.response?.data.message ?? axiosError.message
    }
    return 'An unexpected error occurred'
  },
}