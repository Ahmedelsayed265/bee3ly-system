import { Button } from '@/components/ui/button';
import type { VariantDictionaryOption } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import {
  formatVariantLabel,
  type ProductVariantSku,
} from '@/features/products/product-variants';
import { cn } from '@/lib/utils';

export type VariantAxisDraft = {
  dictionaryId: string;
  name: string;
  selectedValues: string[];
};

type ProductVariantsEditorProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  dictionary: VariantDictionaryOption[];
  axes: VariantAxisDraft[];
  onAxesChange: (next: VariantAxisDraft[]) => void;
  skus: ProductVariantSku[];
  onSkuChange: (key: string, patch: Partial<ProductVariantSku>) => void;
  onApplyDefaults: () => void;
  onOpenDictionary: () => void;
  quantityMode: boolean;
};

export function ProductVariantsEditor({
  enabled,
  onEnabledChange,
  dictionary,
  axes,
  onAxesChange,
  skus,
  onSkuChange,
  onApplyDefaults,
  onOpenDictionary,
  quantityMode,
}: ProductVariantsEditorProps) {
  const { t } = useLocale();
  const selectedIds = new Set(axes.map((a) => a.dictionaryId));

  const toggleOption = (option: VariantDictionaryOption) => {
    if (selectedIds.has(option.id)) {
      onAxesChange(axes.filter((a) => a.dictionaryId !== option.id));
      return;
    }
    onAxesChange([
      ...axes,
      {
        dictionaryId: option.id,
        name: option.name,
        selectedValues: [],
      },
    ]);
  };

  const toggleValue = (dictionaryId: string, value: string) => {
    onAxesChange(
      axes.map((axis) => {
        if (axis.dictionaryId !== dictionaryId) return axis;
        const has = axis.selectedValues.includes(value);
        return {
          ...axis,
          selectedValues: has
            ? axis.selectedValues.filter((v) => v !== value)
            : [...axis.selectedValues, value],
        };
      }),
    );
  };

  return (
    <section className="border-border bg-page/50 space-y-4 rounded-xl border p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-ink text-sm font-semibold">
            {t('productVariantsSection')}
          </p>
          <p className="text-muted mt-0.5 text-xs">
            {t('productVariantsPickHint')}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={enabled ? 'default' : 'outline'}
          onClick={() => onEnabledChange(!enabled)}
        >
          {enabled ? t('variantsEnabled') : t('variantsEnable')}
        </Button>
      </div>

      {!enabled ? null : !dictionary.length ? (
        <div className="border-border bg-surface space-y-2 rounded-xl border border-dashed p-4 text-center">
          <p className="text-muted text-xs">{t('variantDictEmptyInProduct')}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpenDictionary}
          >
            {t('variantDictManage')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-ink text-xs font-semibold">
              {t('variantPickOptions')}
            </p>
            <div className="flex flex-wrap gap-2">
              {dictionary.map((option) => {
                const active = selectedIds.has(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleOption(option)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                      active
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-border bg-surface text-muted hover:border-brand/40 hover:text-ink',
                    )}
                  >
                    {option.name}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="text-brand text-[11px] font-semibold underline-offset-2 hover:underline"
              onClick={onOpenDictionary}
            >
              {t('variantDictManage')}
            </button>
          </div>

          {axes.map((axis) => {
            const option = dictionary.find((d) => d.id === axis.dictionaryId);
            const pool = option?.values ?? axis.selectedValues;
            return (
              <div key={axis.dictionaryId} className="space-y-2">
                <p className="text-ink text-xs font-semibold">
                  {t('variantPickValuesFor', { name: axis.name })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {pool.map((value) => {
                    const active = axis.selectedValues.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleValue(axis.dictionaryId, value)}
                        className={cn(
                          'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
                          active
                            ? 'border-trust bg-trust/10 text-trust'
                            : 'border-border bg-surface text-muted hover:border-trust/40 hover:text-ink',
                        )}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {skus.length > 0 ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-ink text-xs font-semibold">
                  {t('variantMatrixTitle', { count: String(skus.length) })}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={onApplyDefaults}
                >
                  {t('variantApplyBasePrice')}
                </Button>
              </div>
              <div className="border-border bg-surface overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[28rem] border-collapse text-sm">
                  <thead>
                    <tr className="border-border bg-canvas/60 text-muted border-b text-xs font-semibold tracking-wide uppercase">
                      <th className="px-3 py-2.5 text-start">
                        {t('variantColCombo')}
                      </th>
                      <th className="px-3 py-2.5 text-start">
                        {t('variantColPrice')}
                      </th>
                      {quantityMode ? (
                        <th className="px-3 py-2.5 text-start">
                          {t('variantColQty')}
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {skus.map((sku) => (
                      <tr
                        key={sku.key}
                        className="border-border border-b last:border-b-0"
                      >
                        <td className="text-ink px-3 py-2.5 text-start align-middle text-xs font-medium">
                          {formatVariantLabel(sku.options)}
                        </td>
                        <td className="px-3 py-2 text-start align-middle">
                          <input
                            type="number"
                            min={0}
                            value={sku.priceEgp}
                            onChange={(e) =>
                              onSkuChange(sku.key, {
                                priceEgp: Math.max(
                                  0,
                                  Math.floor(Number(e.target.value) || 0),
                                ),
                              })
                            }
                            className="border-border bg-surface text-ink focus-visible:border-brand focus-visible:ring-brand/20 w-28 rounded-lg border px-2.5 py-1.5 text-sm tabular-nums outline-none focus-visible:ring-2"
                            aria-label={t('variantColPrice')}
                          />
                          <span className="text-muted ms-1 text-xs">
                            {t('egp')}
                          </span>
                        </td>
                        {quantityMode ? (
                          <td className="px-3 py-2 text-start align-middle">
                            <input
                              type="number"
                              min={0}
                              value={sku.stockQuantity}
                              onChange={(e) =>
                                onSkuChange(sku.key, {
                                  stockQuantity: Math.max(
                                    0,
                                    Math.floor(Number(e.target.value) || 0),
                                  ),
                                })
                              }
                              className="border-border bg-surface text-ink focus-visible:border-brand focus-visible:ring-brand/20 w-24 rounded-lg border px-2.5 py-1.5 text-sm tabular-nums outline-none focus-visible:ring-2"
                              aria-label={t('variantColQty')}
                            />
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-muted text-[11px]">{t('variantMatrixNote')}</p>
            </div>
          ) : axes.length > 0 ? (
            <p className="text-muted text-xs">{t('variantPickValuesHint')}</p>
          ) : null}
        </div>
      )}
    </section>
  );
}
