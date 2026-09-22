import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Product } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';

type StockUpdate =
  { id: string; stockQuantity: number } | { id: string; inStock: boolean };

type ProductStockControlsProps = {
  product: Product;
  quantityMode: boolean;
  isPending: boolean;
  onUpdateStock: (input: StockUpdate) => void;
};

export function ProductStockControls({
  product,
  quantityMode,
  isPending,
  onUpdateStock,
}: ProductStockControlsProps) {
  const { t } = useLocale();
  const qty = product.stockQuantity ?? 0;

  if (quantityMode) {
    return (
      <div className="border-border bg-page inline-flex items-center gap-1 rounded-xl border p-0.5">
        <button
          type="button"
          disabled={isPending || qty <= 0}
          onClick={() =>
            onUpdateStock({
              id: product.id,
              stockQuantity: Math.max(0, qty - 1),
            })
          }
          className="text-muted hover:bg-surface hover:text-ink inline-flex h-8 w-8 items-center justify-center rounded-lg transition disabled:opacity-40"
          aria-label="-1"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="text-ink min-w-8 text-center text-sm font-semibold tabular-nums">
          {qty}
        </span>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            onUpdateStock({
              id: product.id,
              stockQuantity: qty + 1,
            })
          }
          className="text-muted hover:bg-surface hover:text-ink inline-flex h-8 w-8 items-center justify-center rounded-lg transition disabled:opacity-40"
          aria-label="+1"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        onUpdateStock({
          id: product.id,
          inStock: !product.inStock,
        })
      }
    >
      {product.inStock ? t('availableListing') : t('unavailableListing')}
    </Button>
  );
}
