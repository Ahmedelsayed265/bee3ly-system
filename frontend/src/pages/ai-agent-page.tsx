import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import {
  fetchAiAgent,
  simulateMessage,
  updateAiAgent,
} from '@/features/business/api'
import { useLocale } from '@/features/i18n/locale-context'
import type { MessageKey } from '@/features/i18n/messages'
import { cn } from '@/lib/utils'

const GOALS = ['GET_ORDERS', 'ANSWER_QUESTIONS', 'QUALIFY', 'BOOK_APPOINTMENTS']
const TONES = ['FRIENDLY', 'PROFESSIONAL', 'SHORT', 'EGYPTIAN']

export function AiAgentPage() {
  const { t } = useLocale()
  const qc = useQueryClient()
  const agentQuery = useQuery({ queryKey: ['ai-agent'], queryFn: fetchAiAgent })
  const [instructions, setInstructions] = useState<string | null>(null)
  const [testDraft, setTestDraft] = useState('بكام؟')
  const [testReply, setTestReply] = useState<string | null>(null)

  const updateMut = useMutation({
    mutationFn: updateAiAgent,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['ai-agent'] })
    },
  })

  const testMut = useMutation({
    mutationFn: () => simulateMessage(testDraft),
    onSuccess: (data) => {
      setTestReply(
        data.paused
          ? t('aiPausedNotice')
          : (data.reply ?? t('aiPausedNotice')),
      )
    },
  })

  const agent = agentQuery.data
  const instructionValue =
    instructions ?? agent?.instructions ?? ''

  return (
    <PageLayout title={t('navAi')} description={t('aiIntro')}>
      <div className="grid w-full gap-4 xl:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-ink">{t('aiActive')}</p>
              <p className="text-xs text-muted">{t('aiActiveHint')}</p>
            </div>
            <Button
              size="sm"
              variant={agent?.isActive ? 'default' : 'outline'}
              onClick={() => updateMut.mutate({ isActive: !agent?.isActive })}
            >
              {agent?.isActive ? t('on') : t('off')}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <div>
              <p className="font-semibold text-ink">{t('aiHandoff')}</p>
              <p className="text-xs text-muted">{t('aiHandoffHint')}</p>
            </div>
            <Button
              size="sm"
              variant={agent?.handoffEnabled !== false ? 'default' : 'outline'}
              onClick={() =>
                updateMut.mutate({
                  handoffEnabled: !(agent?.handoffEnabled !== false),
                })
              }
            >
              {agent?.handoffEnabled !== false ? t('on') : t('off')}
            </Button>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm font-medium text-ink">{t('aiPrimaryGoal')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {GOALS.map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => updateMut.mutate({ primaryGoal: goal })}
                className={cn(
                  'rounded-xl border px-3 py-3 text-start text-sm transition',
                  agent?.primaryGoal === goal
                    ? 'border-brand bg-brand/10'
                    : 'border-border hover:bg-lavender',
                )}
              >
                {t(`aiGoal_${goal}` as MessageKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm font-medium text-ink">{t('aiTone')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {TONES.map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => updateMut.mutate({ tone })}
                className={cn(
                  'rounded-xl border px-3 py-3 text-start text-sm',
                  (agent?.tone ?? 'FRIENDLY') === tone
                    ? 'border-brand bg-brand/10'
                    : 'border-border hover:bg-lavender',
                )}
              >
                {t(`aiTone_${tone}` as MessageKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm font-medium text-ink">{t('aiInstructions')}</p>
          <p className="text-xs text-muted">{t('aiInstructionsHint')}</p>
          <textarea
            className="min-h-24 w-full rounded-xl border border-border bg-page px-3 py-2 text-sm outline-none focus:border-brand/40"
            value={instructionValue}
            onChange={(e) => setInstructions(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              updateMut.mutate({ instructions: instructionValue.trim() || null })
            }
          >
            {t('saveProfile')}
          </Button>
          <p className="text-xs text-muted">
            <Link to="/app/products" className="text-brand">
              {t('navProducts')}
            </Link>
            {' · '}
            <Link to="/app/settings" className="text-brand">
              {t('businessKnowledge')}
            </Link>
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-surface p-5 xl:col-span-2">
          <p className="text-sm font-medium text-ink">{t('aiTestArea')}</p>
          <div className="flex flex-wrap gap-2">
            <input
              className="h-10 min-w-[220px] flex-1 rounded-xl border border-border bg-page px-3 text-sm"
              value={testDraft}
              onChange={(e) => setTestDraft(e.target.value)}
            />
            <Button
              size="sm"
              disabled={testMut.isPending || !testDraft.trim()}
              onClick={() => testMut.mutate()}
            >
              {t('send')}
            </Button>
          </div>
          {testReply ? (
            <div className="rounded-xl bg-lavender/70 px-3 py-2 text-sm text-ink">
              {testReply}
            </div>
          ) : null}
        </div>
      </div>
    </PageLayout>
  )
}
