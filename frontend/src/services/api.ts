import axios from 'axios'
import type { ApiResponse,  Booking, BookingStatus, PaymentStatus, User } from '../types'

export interface AuthResult {
  user: User
  token: string
}

export interface ApiHealth {
  status: 'ok'
  databaseConfigured: boolean
}

export interface CreateBookingInput {
  hotelId?: string
  packageId?: string
  checkIn: string
  checkOut: string
  guests: number
  specialRequests?: string
}

interface BookingDto {
  id: string
  userId: string
  hotelId: string | null
  packageId: string | null
  checkIn: string
  checkOut: string
  guests: number
  totalPrice: number
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED'
  specialRequests?: string | null
  createdAt: string
  hotel?: { name: string } | null
  tourPackage?: { name: string } | null
  user?: {
    name: string
    email: string
  } | null
}

export interface DatabaseBooking extends Booking {
  userName: string
  userEmail: string
  specialRequests?: string
}

export interface AdminStats {
  users: number
  destinations: number
  hotels: number
  activities: number
  packages: number
  bookings: number
  revenue: number
}

function normalizeBooking(item: BookingDto): DatabaseBooking {
  const statuses: Record<BookingDto['status'], BookingStatus> = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    CANCELLED: 'Cancelled',
    COMPLETED: 'Completed',
  }

  const payments: Record<BookingDto['paymentStatus'], PaymentStatus> = {
    UNPAID: 'Unpaid',
    PAID: 'Paid',
    REFUNDED: 'Refunded',
  }

  return {
    id: item.id,
    userId: item.userId,
    itemName:
      item.hotel?.name ??
      item.tourPackage?.name ??
      'Unavailable listing',
    itemType: item.hotelId ? 'Hotel' : 'Package',
    checkIn: item.checkIn.slice(0, 10),
    checkOut: item.checkOut.slice(0, 10),
    guests: item.guests,
    totalPrice: item.totalPrice,
    status: statuses[item.status],
    paymentStatus: payments[item.paymentStatus],
    createdAt: item.createdAt.slice(0, 10),
    userName: item.user?.name ?? '',
    userEmail: item.user?.email ?? '',
    specialRequests: item.specialRequests ?? undefined,
  }
}

const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api', timeout: 8000 })

client.interceptors.request.use(config => {
  const token = localStorage.getItem('tm-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const api = {
    async getBookings(
    scope: 'mine' | 'all' = 'mine',
  ): Promise<ApiResponse<DatabaseBooking[]>> {
    const response = await client.get<ApiResponse<BookingDto[]>>(
      '/bookings',
      {
        params: { scope },
      },
    )

    return {
      data: response.data.data.map(normalizeBooking),
    }
  },

  async createBooking(
    input: CreateBookingInput,
  ): Promise<ApiResponse<DatabaseBooking>> {
    const response = await client.post<ApiResponse<BookingDto>>(
      '/bookings',
      input,
    )

    return {
      data: normalizeBooking(response.data.data),
    }
  },

  async cancelBooking(
    id: string,
  ): Promise<ApiResponse<DatabaseBooking>> {
    const response = await client.post<ApiResponse<BookingDto>>(
      '/bookings/' + id + '/cancel',
    )

    return {
      data: normalizeBooking(response.data.data),
    }
  },

  async getAdminStats(): Promise<ApiResponse<AdminStats>> {
    const response = await client.get<ApiResponse<AdminStats>>(
      '/admin/stats',
    )

    return response.data
  },
    async me(): Promise<ApiResponse<User>> {
    const response = await client.get<ApiResponse<User>>('/auth/me')
    return response.data
  },

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