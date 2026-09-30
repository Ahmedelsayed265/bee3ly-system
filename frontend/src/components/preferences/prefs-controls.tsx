import { LanguageDropdown } from '@/components/preferences/language-dropdown';
import { ThemeToggle } from '@/components/preferences/theme-toggle';
import { cn } from '@/lib/utils';

type PrefsControlsProps = {
  className?: string;
  compactOnMobile?: boolean;
  iconButtonClass?: string;
};

export function PrefsControls({
  className,
  compactOnMobile = false,
  iconButtonClass,
}: PrefsControlsProps) {
  return (
    <div className={cn('flex h-9 items-center gap-2.5', className)}>
      <LanguageDropdown compact={compactOnMobile} />
      <ThemeToggle className={iconButtonClass} />
    </div>
  );
}
