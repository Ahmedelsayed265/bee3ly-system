import { DashboardSidebarPanel } from '@/features/dashboard/sidebar-panel';
import { useLocale } from '@/features/i18n/locale-context';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

type DashboardMobileNavProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DashboardMobileNav({
  open,
  onOpenChange,
}: DashboardMobileNavProps) {
  const { t } = useLocale();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        className="bg-ink/45 absolute inset-0 backdrop-blur-[1px]"
        aria-label={t('closeMenu')}
        onClick={() => onOpenChange(false)}
      />
      <aside
        className={cn(
          'border-border bg-surface absolute inset-y-0 start-0 flex w-[min(100%,18.5rem)] flex-col border-e shadow-xl',
          'animate-in slide-in-from-start duration-200',
        )}
        role="dialog"
        aria-modal="true"
        aria-label={t('closeMenu')}
      >
        <button
          type="button"
          className="text-muted hover:bg-lavender hover:text-ink absolute end-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl transition"
          aria-label={t('closeMenu')}
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </button>
        <DashboardSidebarPanel onNavigate={() => onOpenChange(false)} />
      </aside>
    </div>,
    document.body,
  );
}
