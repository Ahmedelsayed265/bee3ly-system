import { Check, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLocale } from '@/features/i18n/locale-context'
import type { Locale } from '@/features/i18n/messages'
import { cn } from '@/lib/utils'

const localeOptions: { value: Locale; labelKey: 'langAr' | 'langEn' }[] = [
  { value: 'ar', labelKey: 'langAr' },
  { value: 'en', labelKey: 'langEn' },
]

export function LanguageDropdown({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale()
  const current = localeOptions.find((item) => item.value === locale) ?? localeOptions[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'group inline-flex h-9 items-center gap-1.5 rounded-[14px] border border-border bg-surface px-3 text-[13px] font-semibold text-ink transition hover:bg-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 data-[state=open]:border-brand/50 data-[state=open]:bg-lavender',
            className,
          )}
        >
          <span>{t(current.labelKey)}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted transition group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[8.5rem]">
        {localeOptions.map((option) => {
          const selected = option.value === locale
          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => setLocale(option.value)}
              className={cn(
                'justify-between gap-6 text-[13px] font-medium',
                selected && 'text-brand',
              )}
            >
              {t(option.labelKey)}
              {selected ? <Check className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
