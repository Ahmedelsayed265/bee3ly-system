import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  fetchConversation,
  fetchConversations,
  simulateMessage,
} from '@/features/business/api'
import { useLocale } from '@/features/i18n/locale-context'
import { cn } from '@/lib/utils'

export function InboxPage() {
  const { t } = useLocale()
  const qc = useQueryClient()
  const listQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (!selectedId && listQuery.data?.[0]?.id) {
      setSelectedId(listQuery.data[0].id)
    }
  }, [listQuery.data, selectedId])

  const detailQuery = useQuery({
    queryKey: ['conversation', selectedId],
    queryFn: () => fetchConversation(selectedId!),
    enabled: Boolean(selectedId),
  })

  const sendMut = useMutation({
    mutationFn: (content: string) =>
      simulateMessage(content, selectedId ?? undefined),
    onSuccess: async (data) => {
      setSelectedId(data.conversationId)
      setDraft('')
      await qc.invalidateQueries({ queryKey: ['conversations'] })
      await qc.invalidateQueries({
        queryKey: ['conversation', data.conversationId],
      })
      await qc.invalidateQueries({ queryKey: ['orders'] })
      await qc.invalidateQueries({ queryKey: ['notifications'] })
      await qc.invalidateQueries({ queryKey: ['overview'] })
      await qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })

  const startSim = () => {
    setSelectedId(null)
    sendMut.mutate(t('simStarterMessage'))
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t('navInbox')}</h1>
          <p className="mt-1 text-sm text-muted">{t('inboxIntro')}</p>
        </div>
        <Button size="sm" onClick={startSim} disabled={sendMut.isPending}>
          {t('startSimulation')}
        </Button>
      </div>

      <div className="grid min-h-[calc(100svh-11rem)] w-full gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-2 rounded-2xl border border-border bg-surface p-3">
          {(listQuery.data ?? []).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={cn(
                'w-full rounded-xl px-3 py-2.5 text-start transition',
                selectedId === c.id
                  ? 'bg-brand/10 text-ink'
                  : 'hover:bg-lavender text-muted',
              )}
            >
              <p className="truncate text-sm font-semibold text-ink">
                {c.customer.name ?? t('unknownCustomer')}
              </p>
              <p className="truncate text-[11px]">
                {c.messages[0]?.content ?? c.channel}
              </p>
            </button>
          ))}
          {(listQuery.data?.length ?? 0) === 0 ? (
            <p className="p-3 text-sm text-muted">{t('noConversations')}</p>
          ) : null}
        </div>

        <div className="flex flex-col rounded-2xl border border-border bg-surface">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {(detailQuery.data?.messages ?? []).map((m) => (
              <div
                key={m.id}
                className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                  m.role === 'CUSTOMER'
                    ? 'ms-auto bg-brand text-white'
                    : 'bg-lavender text-ink',
                )}
              >
                {m.content}
              </div>
            ))}
            {!selectedId ? (
              <p className="text-sm text-muted">{t('inboxEmptyHint')}</p>
            ) : null}
          </div>
          <form
            className="flex gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (!draft.trim()) return
              sendMut.mutate(draft.trim())
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('typeCustomerMessage')}
              className="h-11 flex-1 rounded-xl border border-border bg-page px-3 text-sm outline-none focus:border-brand/40"
            />
            <Button type="submit" disabled={sendMut.isPending || !draft.trim()}>
              {t('send')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
