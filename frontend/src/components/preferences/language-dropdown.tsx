import { Check, ChevronDown, Globe } from 'lucide-react';
import { useLocale } from '@/features/i18n/locale-context';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Locale } from '@/features/i18n/messages';

const localeOptions: { value: Locale; labelKey: 'langAr' | 'langEn' }[] = [
  { value: 'ar', labelKey: 'langAr' },
  { value: 'en', labelKey: 'langEn' },
];

export function LanguageDropdown({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { locale, setLocale, t } = useLocale();
  const current =
    localeOptions.find((item) => item.value === locale) ?? localeOptions[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'group border-border bg-page text-ink hover:bg-lavender focus-visible:ring-brand/40 data-[state=open]:border-brand/50 data-[state=open]:bg-lavender inline-flex h-9 shrink-0 touch-manipulation items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition focus-visible:ring-2 focus-visible:outline-none',
            compact &&
              'max-md:h-9 max-md:w-9 max-md:justify-center max-md:gap-0 max-md:px-0',
            className,
          )}
          aria-label={compact ? t(current.labelKey) : undefined}
        >
          {compact ? (
            <Globe
              className="text-muted h-4 w-4 shrink-0 max-md:block md:hidden"
              aria-hidden
            />
          ) : null}
          <span className={cn(compact && 'max-md:sr-only')}>
            {t(current.labelKey)}
          </span>
          <ChevronDown
            className={cn(
              'text-muted h-3.5 w-3.5 transition group-data-[state=open]:rotate-180',
              compact && 'max-md:hidden',
            )}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-34">
        {localeOptions.map((option) => {
          const selected = option.value === locale;
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
              {selected ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <span className="h-3.5 w-3.5" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
