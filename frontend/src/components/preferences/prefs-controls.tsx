import { LanguageDropdown } from '@/components/preferences/language-dropdown'
import { ThemeToggle } from '@/components/preferences/theme-toggle'
import { cn } from '@/lib/utils'

export function PrefsControls({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LanguageDropdown />
      <ThemeToggle />
    </div>
  )
}
