import { Moon, Sun } from 'lucide-react'
import { useLocale } from '@/features/i18n/locale-context'
import { useTheme } from '@/features/theme/theme-context'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const { t } = useLocale()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-[14px] border border-border bg-surface text-ink transition hover:bg-lavender',
        className,
      )}
      aria-label={t('toggleTheme')}
      title={theme === 'dark' ? t('themeLight') : t('themeDark')}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
