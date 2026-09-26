import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InputField } from '@/components/ui/input-field';
import { Label } from '@/components/ui/label';
import type { VariantDictionaryOption } from '@/features/business/api';
import {
  ProductVariantsEditor,
  type VariantAxisDraft,
} from '@/features/products/components/product-variants-editor';
import type { ProductVariantSku } from '@/features/products/product-variants';
import { useLocale } from '@/features/i18n/locale-context';
import { cn } from '@/lib/utils';

type ProductFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  quantityMode: boolean;
  variantsEnabled: boolean;
  onVariantsEnabledChange: (enabled: boolean) => void;
  dictionary: VariantDictionaryOption[];
  onOpenDictionary: () => void;
  productSku: string;
  name: string;
  onNameChange: (value: string) => void;
  priceEgp: string;
  onPriceChange: (value: string) => void;
  costEgp: string;
  onCostChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  stockQuantity: string;
  onStockQuantityChange: (value: string) => void;
  listingAvailable: boolean;
  onListingAvailableChange: (value: boolean) => void;
  variantAxes: VariantAxisDraft[];
  onVariantAxesChange: Dispatch<SetStateAction<VariantAxisDraft[]>>;
  variantSkus: ProductVariantSku[];
  onSkuChange: (key: string, patch: Partial<ProductVariantSku>) => void;
  onApplyDefaults: () => void;
  isPending: boolean;
  onSubmit: (e: FormEvent) => void;
};

export function ProductFormDialog({
  open,
  onOpenChange,
  mode,
  quantityMode,
  variantsEnabled,
  onVariantsEnabledChange,
  dictionary,
  onOpenDictionary,
  productSku,
  name,
  onNameChange,
  priceEgp,
  onPriceChange,
  costEgp,
  onCostChange,
  description,
  onDescriptionChange,
  stockQuantity,
  onStockQuantityChange,
  listingAvailable,
  onListingAvailableChange,
  variantAxes,
  onVariantAxesChange,
  variantSkus,
  onSkuChange,
  onApplyDefaults,
  isPending,
  onSubmit,
}: ProductFormDialogProps) {
  const { t } = useLocale();
  const isEdit = mode === 'edit';
  const hasVariants = variantsEnabled && variantSkus.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(94vh,960px)] max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('editProductTitle') : t('addProductTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t('editProductHint') : t('addProductHint')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-5">
            <section className="space-y-3">
              <div className="grid gap-3">
                <InputField
                  id="productName"
                  label={t('productName')}
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder={t('productNamePlaceholder')}
                  required
                />

                <div
                  className={cn(
                    'grid gap-3',
                    quantityMode && !hasVariants
                      ? 'sm:grid-cols-3'
                      : !quantityMode
                        ? 'sm:grid-cols-3'
                        : 'sm:grid-cols-2',
                  )}
                >
                  <InputField
                    id="productSku"
                    label={t('attrSku')}
                    value={productSku}
                    readOnly
                    className="bg-page text-muted cursor-default"
                  />
                  <InputField
                    id="productPrice"
                    type="number"
                    min={0}
                    step="1"
                    label={
                      hasVariants ? t('productBasePrice') : t('productPrice')
                    }
                    value={priceEgp}
                    onChange={(e) => onPriceChange(e.target.value)}
                    placeholder="599"
                    required
                  />
                  {quantityMode && !hasVariants ? (
                    <InputField
                      id="stockQuantity"
                      type="number"
                      min={0}
                      label={t('stockQuantity')}
                      value={stockQuantity}
                      onChange={(e) => onStockQuantityChange(e.target.value)}
                      placeholder={t('stockQuantityPlaceholder')}
                    />
                  ) : !quantityMode ? (
                    <div className="space-y-1.5">
                      <p className="text-ink text-sm font-semibold">
                        {t('availabilityLabel')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={listingAvailable ? 'default' : 'outline'}
                          onClick={() => onListingAvailableChange(true)}
                        >
                          {t('availableListing')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={!listingAvailable ? 'default' : 'outline'}
                          onClick={() => onListingAvailableChange(false)}
                        >
                          {t('unavailableListing')}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <InputField
                  id="productCost"
                  type="number"
                  min={0}
                  step="1"
                  label={t('productCost')}
                  value={costEgp}
                  onChange={(e) => onCostChange(e.target.value)}
                  placeholder="0"
                />
                <p className="text-muted text-xs leading-5">
                  {t('productCostNote')}
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="productDescription">
                    {t('productDescription')}
                  </Label>
                  <textarea
                    id="productDescription"
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    placeholder={t('productDescriptionPlaceholder')}
                    rows={3}
                    className={cn(
                      'border-border bg-surface text-ink placeholder:text-muted',
                      'focus-visible:border-brand focus-visible:ring-brand/20',
                      'min-h-20 w-full rounded-xl border px-3.5 py-2.5 text-sm leading-6',
                      'outline-none focus-visible:ring-2',
                    )}
                  />
                </div>
              </div>
            </section>

            <ProductVariantsEditor
              enabled={variantsEnabled}
              onEnabledChange={onVariantsEnabledChange}
              dictionary={dictionary}
              axes={variantAxes}
              onAxesChange={(next) => onVariantAxesChange(next)}
              skus={variantSkus}
              onSkuChange={onSkuChange}
              onApplyDefaults={onApplyDefaults}
              onOpenDictionary={onOpenDictionary}
              quantityMode={quantityMode}
            />
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? t('saving')
                : isEdit
                  ? t('saveProduct')
                  : t('addProduct')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
