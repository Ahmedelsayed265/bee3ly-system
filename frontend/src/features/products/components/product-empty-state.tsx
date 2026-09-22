import { PackagePlus } from 'lucide-react';
import { useLocale } from '@/features/i18n/locale-context';

type ProductEmptyStateProps = {
  onAdd: () => void;
};

export function ProductEmptyState({ onAdd }: ProductEmptyStateProps) {
  const { t } = useLocale();

  return (
    <button
      type="button"
      onClick={onAdd}
      className="border-border bg-surface hover:border-brand/40 hover:bg-lavender/40 flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center transition"
    >
      <span className="bg-brand/10 text-brand inline-flex h-12 w-12 items-center justify-center rounded-2xl">
        <PackagePlus className="h-6 w-6" />
      </span>
      <span className="space-y-1">
        <span className="text-ink block text-sm font-semibold">
          {t('noProducts')}
        </span>
        <span className="text-muted block text-xs">{t('noProductsHint')}</span>
      </span>
    </button>
  );
}
