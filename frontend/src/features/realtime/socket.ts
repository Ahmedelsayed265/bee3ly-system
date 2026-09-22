import { io, type Socket } from 'socket.io-client'
import { getAccessToken } from '@/lib/api'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

let socket: Socket | null = null

export function getRealtimeSocket(): Socket | null {
  return socket
}

export function connectRealtime(): Socket {
  const token = getAccessToken()
  if (!token) {
    throw new Error('No access token for realtime connection')
  }

  if (socket?.connected) {
    return socket
  }

  if (socket) {
    socket.auth = { token }
    socket.connect()
    return socket
  }

  socket = io(`${API_URL}/realtime`, {
    auth: { token },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    autoConnect: true,
  })

  return socket
}

export function disconnectRealtime() {
  if (!socket) return
  socket.removeAllListeners()
  socket.disconnect()
  socket = null
}

export function reconnectRealtimeWithToken(token: string | null) {
  if (!token) {
    disconnectRealtime()
    return
  }
  if (!socket) return
  socket.auth = { token }
  if (socket.connected) {
    socket.disconnect()
  }
  socket.connect()
}
