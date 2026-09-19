import { api, setAccessToken } from '@/lib/api'
import type { Business, BusinessType } from '@/features/business/api'

export type User = {
  id: string
  email: string
  name: string
  createdAt: string
}

export type AuthResponse = {
  user: User
  accessToken: string
}

export type MeResponse = {
  user: User
  business: Business
  role: string
}

export async function register(input: {
  name: string
  email: string
  password: string
  businessName: string
  businessType: BusinessType
}) {
  const { data } = await api.post<AuthResponse>('/auth/register', input)
  setAccessToken(data.accessToken)
  return data
}

export async function login(input: { email: string; password: string }) {
  const { data } = await api.post<AuthResponse>('/auth/login', input)
  setAccessToken(data.accessToken)
  return data
}

export async function logout() {
  await api.post('/auth/logout')
  setAccessToken(null)
}

export async function fetchMe() {
  const { data } = await api.get<MeResponse>('/auth/me')
  return data
}

export async function forgotPassword(input: { email: string }) {
  const { data } = await api.post<{
    success: boolean
    message: string
    resetUrl?: string
    resetToken?: string
  }>('/auth/forgot-password', input)
  return data
}

export async function resetPassword(input: { token: string; password: string }) {
  const { data } = await api.post<{ success: boolean; message: string }>(
    '/auth/reset-password',
    input,
  )
  return data
}
