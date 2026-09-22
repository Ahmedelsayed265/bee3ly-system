import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BusinessType, Product } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import { resolveAttributeEntries } from '@/features/products/attribute-templates';
import { ProductStockControls } from '@/features/products/components/product-stock-controls';
import { cn } from '@/lib/utils';

type StockUpdate =
  { id: string; stockQuantity: number } | { id: string; inStock: boolean };

type ProductCardProps = {
  product: Product;
  businessType: BusinessType;
  quantityMode: boolean;
  isUpdatingStock: boolean;
  onUpdateStock: (input: StockUpdate) => void;
  onDelete: (product: { id: string; name: string }) => void;
};

export function ProductCard({
  product,
  businessType,
  quantityMode,
  isUpdatingStock,
  onUpdateStock,
  onDelete,
}: ProductCardProps) {
  const { t } = useLocale();
  const detailEntries = resolveAttributeEntries(
    (product.attributes ?? {}) as Record<
      string,
      string | number | boolean | string[]
    >,
    businessType,
  );
  const qty = product.stockQuantity ?? 0;
  const isOut = quantityMode ? qty <= 0 : !product.inStock;
  const isLow = quantityMode && qty > 0 && qty <= 5;

  return (
    <article
      className={cn(
        'bg-surface flex flex-col gap-3 rounded-2xl border p-4 transition',
        isOut
          ? 'border-danger/20 bg-danger/[0.02]'
          : 'border-border hover:border-brand/25',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="text-ink truncate text-base font-bold">
            {product.name}
          </h3>
          <p className="text-brand text-lg font-semibold tabular-nums">
            {product.priceEgp.toLocaleString()}{' '}
            <span className="text-muted text-sm font-medium">{t('egp')}</span>
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold',
            isOut
              ? 'bg-danger/10 text-danger'
              : isLow
                ? 'bg-alert/20 text-ink'
                : 'bg-trust/10 text-trust',
          )}
        >
          {quantityMode
            ? isOut
              ? t('outOfStockShort')
              : t('qtyLeft', { count: String(qty) })
            : product.inStock
              ? t('availableListing')
              : t('unavailableListing')}
        </span>
      </div>

      {product.description ? (
        <p className="text-muted line-clamp-2 text-sm leading-6">
          {product.description}
        </p>
      ) : null}

      {detailEntries.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {detailEntries.map((entry) => (
            <span
              key={entry.key}
              className="bg-page text-muted inline-flex max-w-full items-center gap-1 rounded-lg px-2 py-1 text-[11px]"
            >
              <span className="text-ink font-semibold">
                {entry.labelKey ? t(entry.labelKey) : entry.key}
              </span>
              <span className="truncate">{entry.value}</span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="border-border/70 mt-auto flex items-center justify-between gap-2 border-t pt-3">
        <ProductStockControls
          product={product}
          quantityMode={quantityMode}
          isPending={isUpdatingStock}
          onUpdateStock={onUpdateStock}
        />

        <Button
          size="sm"
          variant="ghost"
          className="text-danger hover:bg-danger/10 hover:text-danger"
          onClick={() => onDelete({ id: product.id, name: product.name })}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t('delete')}
        </Button>
      </div>
    </article>
  );
}
