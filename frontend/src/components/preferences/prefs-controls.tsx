import { LanguageDropdown } from '@/components/preferences/language-dropdown';
import { ThemeToggle } from '@/components/preferences/theme-toggle';
import { cn } from '@/lib/utils';

type PrefsControlsProps = {
  className?: string;
  compactOnMobile?: boolean;
};

export function PrefsControls({
  className,
  compactOnMobile = false,
}: PrefsControlsProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LanguageDropdown compact={compactOnMobile} />
      <ThemeToggle />
    </div>
  );
}
