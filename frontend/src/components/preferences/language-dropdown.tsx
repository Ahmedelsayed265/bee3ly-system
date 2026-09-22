import { Check, ChevronDown } from 'lucide-react';
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

export function LanguageDropdown({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();
  const current =
    localeOptions.find((item) => item.value === locale) ?? localeOptions[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'group border-border bg-surface text-ink hover:bg-lavender focus-visible:ring-brand/40 data-[state=open]:border-brand/50 data-[state=open]:bg-lavender inline-flex h-9 items-center gap-1.5 rounded-[14px] border px-3 text-[13px] font-semibold transition focus-visible:ring-2 focus-visible:outline-none',
            className,
          )}
        >
          <span>{t(current.labelKey)}</span>
          <ChevronDown className="text-muted h-3.5 w-3.5 transition group-data-[state=open]:rotate-180" />
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
