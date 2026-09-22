import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuth } from '@/features/auth/auth-context'
import {
  connectRealtime,
  disconnectRealtime,
  getRealtimeSocket,
} from '@/features/realtime/socket'

type ConversationUpdatedPayload = {
  conversationId: string
}

/**
 * Keeps React Query in sync with server push events.
 * Mount once under AuthProvider when the user is authenticated.
 */
export function useRealtimeSync() {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectRealtime()
      return
    }

    const socket = connectRealtime()

    const onConversationUpdated = (payload: ConversationUpdatedPayload) => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] })
      if (payload?.conversationId) {
        void queryClient.invalidateQueries({
          queryKey: ['conversation', payload.conversationId],
        })
      }
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['leads'] })
      void queryClient.invalidateQueries({ queryKey: ['overview'] })
    }

    const onNotificationCreated = () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }

    socket.on('conversation:updated', onConversationUpdated)
    socket.on('notification:created', onNotificationCreated)

    return () => {
      const current = getRealtimeSocket()
      current?.off('conversation:updated', onConversationUpdated)
      current?.off('notification:created', onNotificationCreated)
      disconnectRealtime()
    }
  }, [isAuthenticated, queryClient])
}

export function RealtimeSync() {
  useRealtimeSync()
  return null
}
