import { useTheme } from '@/features/theme/theme-context';
import { useLocale } from '@/features/i18n/locale-context';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

export function Toaster({ ...props }: ToasterProps) {
  const { theme } = useTheme();
  const { dir } = useLocale();

  return (
    <Sonner
      theme={theme}
      dir={dir}
      className="toaster group"
      position={dir === 'rtl' ? 'top-left' : 'top-right'}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-surface group-[.toaster]:text-ink group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted',
          actionButton:
            'group-[.toast]:bg-brand group-[.toast]:text-brand-foreground',
          cancelButton: 'group-[.toast]:bg-lavender group-[.toast]:text-muted',
          success: 'group-[.toast]:border-trust/30',
          error: 'group-[.toast]:border-danger/30',
        },
      }}
      {...props}
    />
  );
}
