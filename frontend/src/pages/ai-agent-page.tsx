import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { fetchAiAgent, updateAiAgent } from '@/features/business/api'
import { useLocale } from '@/features/i18n/locale-context'
import type { MessageKey } from '@/features/i18n/messages'
import { cn } from '@/lib/utils'

const GOALS = ['GET_ORDERS', 'ANSWER_QUESTIONS', 'QUALIFY', 'BOOK_APPOINTMENTS']

export function AiAgentPage() {
  const { t } = useLocale()
  const qc = useQueryClient()
  const agentQuery = useQuery({ queryKey: ['ai-agent'], queryFn: fetchAiAgent })

  const updateMut = useMutation({
    mutationFn: updateAiAgent,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['ai-agent'] })
    },
  })

  const agent = agentQuery.data

  return (
    <PageLayout title={t('navAi')} description={t('aiIntro')}>
      <div className="grid w-full gap-4 lg:grid-cols-[1fr_1.4fr]">
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
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm font-medium text-ink">{t('aiPrimaryGoal')}</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
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
      </div>
    </PageLayout>
  )
}
