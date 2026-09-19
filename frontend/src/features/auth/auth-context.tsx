import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchMe,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  type User,
} from '@/features/auth/api'
import type { Business, BusinessType } from '@/features/business/api'
import { getAccessToken, setAccessToken } from '@/lib/api'

type AuthContextValue = {
  user: User | null
  business: Business | null
  isLoading: boolean
  isAuthenticated: boolean
  needsOnboarding: boolean
  login: (input: { email: string; password: string }) => Promise<void>
  register: (input: {
    name: string
    email: string
    password: string
    businessName: string
    businessType: BusinessType
  }) => Promise<void>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [bootstrapped, setBootstrapped] = useState(!getAccessToken())

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    enabled: Boolean(getAccessToken()),
    retry: false,
  })

  useEffect(() => {
    if (!getAccessToken()) {
      setBootstrapped(true)
      return
    }
    if (!meQuery.isFetching) {
      setBootstrapped(true)
    }
  }, [meQuery.isFetching])

  useEffect(() => {
    if (meQuery.isError) {
      setAccessToken(null)
    }
  }, [meQuery.isError])

  const hydrateSession = useCallback(async () => {
    const me = await fetchMe()
    queryClient.setQueryData(['auth', 'me'], me)
    setBootstrapped(true)
    return me
  }, [queryClient])

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      await loginRequest(input)
      await hydrateSession()
    },
    [hydrateSession],
  )

  const register = useCallback(
    async (input: {
      name: string
      email: string
      password: string
      businessName: string
      businessType: BusinessType
    }) => {
      await registerRequest(input)
      await hydrateSession()
    },
    [hydrateSession],
  )

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      queryClient.setQueryData(['auth', 'me'], null)
      queryClient.clear()
      setBootstrapped(true)
    }
  }, [queryClient])

  const refreshMe = useCallback(async () => {
    await hydrateSession()
  }, [hydrateSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data?.user ?? null,
      business: meQuery.data?.business ?? null,
      isLoading: !bootstrapped || (Boolean(getAccessToken()) && meQuery.isLoading),
      isAuthenticated: Boolean(meQuery.data?.user),
      needsOnboarding: Boolean(
        meQuery.data?.user && !meQuery.data.business?.onboardingCompletedAt,
      ),
      login,
      register,
      logout,
      refreshMe,
    }),
    [
      bootstrapped,
      meQuery.data,
      meQuery.isLoading,
      login,
      register,
      logout,
      refreshMe,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
