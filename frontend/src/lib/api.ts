import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    // Required for free ngrok tunnels: without this, browser GETs get an HTML
    // interstitial (ERR_NGROK_6024) with no CORS headers — shows up as "CORS error".
    'ngrok-skip-browser-warning': 'true',
  },
})

let accessToken: string | null = localStorage.getItem('bee3ly_access_token')

export function setAccessToken(token: string | null) {
  accessToken = token
  if (token) {
    localStorage.setItem('bee3ly_access_token', token)
  } else {
    localStorage.removeItem('bee3ly_access_token')
  }
}

export function getAccessToken() {
  return accessToken
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

type RetryConfig = { _retry?: boolean }

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as (typeof error.config & RetryConfig) | undefined
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !String(original.url ?? '').includes('/auth/login') &&
      !String(original.url ?? '').includes('/auth/register') &&
      !String(original.url ?? '').includes('/auth/refresh')
    ) {
      original._retry = true
      refreshPromise ??= api
        .post<{ accessToken: string }>('/auth/refresh')
        .then((res) => {
          setAccessToken(res.data.accessToken)
          return res.data.accessToken
        })
        .catch(() => {
          setAccessToken(null)
          return null
        })
        .finally(() => {
          refreshPromise = null
        })

      const token = await refreshPromise
      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      }
    }
    return Promise.reject(error)
  },
)
