import { Moon, Sun } from 'lucide-react';
import { useLocale } from '@/features/i18n/locale-context';
import { useTheme } from '@/features/theme/theme-context';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLocale();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'border-border bg-surface text-ink hover:bg-lavender inline-flex h-9 w-9 items-center justify-center rounded-[14px] border transition',
        className,
      )}
      aria-label={t('toggleTheme')}
      title={theme === 'dark' ? t('themeLight') : t('themeDark')}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
