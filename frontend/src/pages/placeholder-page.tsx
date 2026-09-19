import { useLocale } from '@/features/i18n/locale-context'
import type { MessageKey } from '@/features/i18n/messages'
import { Construction } from 'lucide-react'

export function PlaceholderPage({ titleKey }: { titleKey: MessageKey }) {
  const { t } = useLocale()

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
      <Construction className="mb-3 h-8 w-8 text-brand" />
      <h1 className="text-xl font-bold text-ink">{t(titleKey)}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">{t('comingSoon')}</p>
    </div>
  )
}
