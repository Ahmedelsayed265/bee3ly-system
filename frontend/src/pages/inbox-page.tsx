import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, UserRound, Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  fetchConversation,
  fetchConversations,
  sendHumanMessage,
  setConversationMode,
} from '@/features/business/api'
import { useLocale } from '@/features/i18n/locale-context'
import { cn } from '@/lib/utils'

export function InboxPage() {
  const { t } = useLocale()
  const qc = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
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

  const conversation = detailQuery.data?.conversation
  const isHumanMode =
    conversation?.mode === 'HUMAN' || conversation?.needsHuman
  const messages = conversation?.messages ?? []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [selectedId, messages.length])

  const invalidateAll = async (conversationId?: string) => {
    await qc.invalidateQueries({ queryKey: ['conversations'] })
    if (conversationId) {
      await qc.invalidateQueries({ queryKey: ['conversation', conversationId] })
    }
    await qc.invalidateQueries({ queryKey: ['orders'] })
    await qc.invalidateQueries({ queryKey: ['notifications'] })
    await qc.invalidateQueries({ queryKey: ['overview'] })
    await qc.invalidateQueries({ queryKey: ['leads'] })
  }

  const sendMut = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedId || !isHumanMode) {
        throw new Error('HUMAN_MODE_REQUIRED')
      }
      await sendHumanMessage(selectedId, content)
      return { conversationId: selectedId }
    },
    onSuccess: async (data) => {
      setDraft('')
      await invalidateAll(data.conversationId)
    },
  })

  const modeMut = useMutation({
    mutationFn: (mode: 'AI' | 'HUMAN') =>
      setConversationMode(selectedId!, mode),
    onSuccess: async () => {
      await invalidateAll(selectedId ?? undefined)
    },
  })

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-ink">{t('navInbox')}</h1>
        <p className="mt-1 text-sm text-muted">{t('inboxIntro')}</p>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden grid-rows-[minmax(10rem,32%)_minmax(0,1fr)] lg:grid-rows-none lg:grid-cols-[320px_1fr]">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
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
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-ink">
                    {c.customer.name ?? t('unknownCustomer')}
                  </p>
                  <span className="text-[10px] font-semibold text-muted">
                    {c.mode === 'HUMAN' || c.needsHuman
                      ? t('modeYou')
                      : t('modeAi')}
                  </span>
                </div>
                <p className="truncate text-[11px]">
                  {c.messages[0]?.content ?? c.channel}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-muted">
                  {c.conversionStage ?? 'NEW'}
                  {c.leads?.[0]?.status ? ` · ${c.leads[0].status}` : ''}
                </p>
              </button>
            ))}
            {(listQuery.data?.length ?? 0) === 0 ? (
              <p className="p-3 text-sm text-muted">{t('noConversations')}</p>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface">
          {conversation ? (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">
                  {conversation.customer.name ?? t('unknownCustomer')}
                </p>
                <p className="text-[11px] text-muted">
                  {conversation.channel}
                  {conversation.campaign
                    ? ` · ${conversation.campaign.name}`
                    : ''}
                  {conversation.handoffReason
                    ? ` · ${conversation.handoffReason}`
                    : ''}
                </p>
              </div>
              <div className="flex gap-2">
                {isHumanMode ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => modeMut.mutate('AI')}
                    disabled={modeMut.isPending}
                  >
                    {t('returnToAi')}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => modeMut.mutate('HUMAN')}
                    disabled={modeMut.isPending}
                  >
                    {t('takeOver')}
                  </Button>
                )}
              </div>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((m) => {
              const isCustomer = m.role === 'CUSTOMER'
              const isHuman = m.role === 'HUMAN'
              const speaker = isCustomer
                ? (conversation?.customer.name ?? t('speakerCustomer'))
                : isHuman
                  ? t('speakerYou')
                  : t('speakerAi')

              return (
                <div
                  key={m.id}
                  className={cn(
                    'flex max-w-[85%] flex-col gap-1.5',
                    isCustomer ? 'ms-auto items-end' : 'items-start',
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center gap-1.5',
                      isCustomer ? 'flex-row-reverse' : 'flex-row',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                        isCustomer
                          ? 'bg-brand text-white'
                          : isHuman
                            ? 'bg-trust text-white'
                            : 'bg-lavender text-ink',
                      )}
                    >
                      {isCustomer ? (
                        <UserRound className="h-3.5 w-3.5" />
                      ) : isHuman ? (
                        <Zap className="h-3.5 w-3.5" />
                      ) : (
                        <Bot className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <span className="text-[11px] font-medium text-muted">
                      {speaker}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'w-fit rounded-2xl px-3 py-2 text-sm',
                      isCustomer
                        ? 'rounded-se-md bg-brand text-white'
                        : isHuman
                          ? 'rounded-ss-md border border-trust/25 bg-trust/10 text-ink'
                          : 'rounded-ss-md bg-lavender text-ink',
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              )
            })}
            {!selectedId ? (
              <p className="text-sm text-muted">{t('inboxEmptyHint')}</p>
            ) : null}
            <div ref={messagesEndRef} />
          </div>
          <form
            className="flex shrink-0 gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (!draft.trim() || !isHumanMode) return
              sendMut.mutate(draft.trim())
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={!isHumanMode}
              placeholder={
                isHumanMode ? t('typeYourReply') : t('inboxTakeoverHint')
              }
              className="h-11 flex-1 rounded-xl border border-border bg-page px-3 text-sm outline-none focus:border-brand/40 disabled:opacity-70"
            />
            <Button
              type="submit"
              disabled={sendMut.isPending || !draft.trim() || !isHumanMode}
            >
              {t('send')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
