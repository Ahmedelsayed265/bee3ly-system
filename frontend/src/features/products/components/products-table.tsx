import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BusinessType, Product } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import { resolveAttributeEntries } from '@/features/products/attribute-templates';
import {
  asVariants,
  hasVariantMatrix,
  variantsTotalStock,
} from '@/features/products/product-variants';
import { cn } from '@/lib/utils';

type ProductsTableProps = {
  products: Product[];
  businessType: BusinessType;
  quantityMode: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: { id: string; name: string }) => void;
};

export function ProductsTable({
  products,
  businessType,
  quantityMode,
  onEdit,
  onDelete,
}: ProductsTableProps) {
  const { t, locale } = useLocale();

  return (
    <div className="border-border bg-surface w-full overflow-x-auto rounded-2xl border">
      <table className="w-full min-w-[52rem] border-collapse text-sm">
        <thead>
          <tr className="border-border bg-canvas/60 text-muted border-b text-xs font-semibold tracking-wide uppercase">
            <th className="px-4 py-3 text-start">{t('productColName')}</th>
            <th className="px-4 py-3 text-start">{t('productColPrice')}</th>
            <th className="px-4 py-3 text-start">{t('productColStock')}</th>
            <th className="px-4 py-3 text-start">{t('productColDetails')}</th>
            <th className="px-4 py-3 text-start">{t('productColActions')}</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const variants = asVariants(product.variants);
            const withVariants = hasVariantMatrix(variants);
            const detailEntries = resolveAttributeEntries(
              (product.attributes ?? {}) as Record<
                string,
                string | number | boolean | string[]
              >,
              businessType,
            );
            const qty = withVariants
              ? variantsTotalStock(variants)
              : (product.stockQuantity ?? 0);
            const priceEgp = withVariants
              ? (variants.skus[0]?.priceEgp ?? product.priceEgp)
              : product.priceEgp;
            const isOut = quantityMode ? qty <= 0 : !product.inStock;
            const isLow = quantityMode && qty > 0 && qty <= 5;

            return (
              <tr
                key={product.id}
                className="border-border hover:bg-canvas/40 border-b last:border-b-0"
              >
                <td className="px-4 py-3 text-start align-top">
                  <p className="text-ink font-semibold">{product.name}</p>
                  {product.description ? (
                    <p className="text-muted mt-0.5 line-clamp-2 max-w-xs text-xs leading-5">
                      {product.description}
                    </p>
                  ) : null}
                  {withVariants ? (
                    <p className="text-brand mt-1 text-[11px] font-semibold">
                      {t('variantCountBadge', {
                        count: String(variants.skus.length),
                      })}
                    </p>
                  ) : null}
                </td>
                <td className="text-ink px-4 py-3 text-start align-top font-semibold tabular-nums">
                  {priceEgp.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}{' '}
                  <span className="text-muted text-xs font-medium">
                    {t('egp')}
                  </span>
                </td>
                <td className="px-4 py-3 text-start align-top">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
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
                </td>
                <td className="px-4 py-3 text-start align-top">
                  {withVariants ? (
                    <div className="flex max-w-sm flex-wrap gap-1.5">
                      {variants.axes.map((axis) => (
                        <span
                          key={axis.name}
                          className="bg-page text-muted inline-flex max-w-full items-center gap-1 rounded-lg px-2 py-1 text-[11px]"
                        >
                          <span className="text-ink font-semibold">
                            {axis.name}
                          </span>
                          <span className="truncate">
                            {axis.values.join(', ')}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : detailEntries.length ? (
                    <div className="flex max-w-sm flex-wrap gap-1.5">
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
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-start align-top">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs"
                      onClick={() => onEdit(product)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t('edit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger hover:bg-danger/10 hover:text-danger h-8 px-2.5 text-xs"
                      onClick={() =>
                        onDelete({ id: product.id, name: product.name })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('delete')}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
