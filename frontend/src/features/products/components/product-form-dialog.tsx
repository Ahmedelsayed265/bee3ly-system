import { Plus } from 'lucide-react';
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
import type { AttributeTemplateField } from '@/features/products/attribute-templates';
import { useLocale } from '@/features/i18n/locale-context';

type ProductFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quantityMode: boolean;
  template: AttributeTemplateField[];
  formHint: string;
  name: string;
  onNameChange: (value: string) => void;
  priceEgp: string;
  onPriceChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  stockQuantity: string;
  onStockQuantityChange: (value: string) => void;
  listingAvailable: boolean;
  onListingAvailableChange: (value: boolean) => void;
  templateValues: Record<string, string>;
  onTemplateValuesChange: Dispatch<SetStateAction<Record<string, string>>>;
  customRows: Array<{ key: string; value: string }>;
  onCustomRowsChange: Dispatch<
    SetStateAction<Array<{ key: string; value: string }>>
  >;
  isPending: boolean;
  onSubmit: (e: FormEvent) => void;
};

export function ProductFormDialog({
  open,
  onOpenChange,
  quantityMode,
  template,
  formHint,
  name,
  onNameChange,
  priceEgp,
  onPriceChange,
  description,
  onDescriptionChange,
  stockQuantity,
  onStockQuantityChange,
  listingAvailable,
  onListingAvailableChange,
  templateValues,
  onTemplateValuesChange,
  customRows,
  onCustomRowsChange,
  isPending,
  onSubmit,
}: ProductFormDialogProps) {
  const { t } = useLocale();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('addProductTitle')}</DialogTitle>
          <DialogDescription>{t('addProductHint')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField
                id="productName"
                label={t('productName')}
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder={t('productNamePlaceholder')}
                containerClassName="sm:col-span-2"
              />
              <InputField
                id="productPrice"
                type="number"
                label={t('productPrice')}
                value={priceEgp}
                onChange={(e) => onPriceChange(e.target.value)}
                placeholder="599"
              />
              {quantityMode ? (
                <InputField
                  id="stockQuantity"
                  type="number"
                  label={t('stockQuantity')}
                  value={stockQuantity}
                  onChange={(e) => onStockQuantityChange(e.target.value)}
                  placeholder={t('stockQuantityPlaceholder')}
                />
              ) : (
                <div className="space-y-1.5">
                  <p className="text-ink text-sm font-semibold">
                    {t('availabilityLabel')}
                  </p>
                  <div className="flex gap-2">
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
              )}
              <InputField
                id="productDescription"
                label={t('productDescription')}
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder={t('productDescriptionPlaceholder')}
                containerClassName="sm:col-span-2"
              />
            </div>

            <div className="border-border bg-page/50 space-y-3 rounded-xl border p-4">
              <div>
                <p className="text-ink text-sm font-semibold">
                  {t('productDetails')}
                </p>
                <p className="text-muted mt-0.5 text-xs">{formHint}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {template.map((field) => (
                  <InputField
                    key={field.key}
                    id={`attr-${field.key}`}
                    type={field.kind === 'number' ? 'number' : 'text'}
                    label={t(field.labelKey)}
                    value={templateValues[field.key] ?? ''}
                    onChange={(e) =>
                      onTemplateValuesChange((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    placeholder={
                      field.placeholderKey ? t(field.placeholderKey) : undefined
                    }
                  />
                ))}
              </div>

              {customRows.map((row, index) => (
                <div
                  key={`custom-${index}`}
                  className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <InputField
                    id={`custom-key-${index}`}
                    label={t('attrCustomKey')}
                    value={row.key}
                    onChange={(e) =>
                      onCustomRowsChange((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, key: e.target.value } : item,
                        ),
                      )
                    }
                  />
                  <InputField
                    id={`custom-value-${index}`}
                    label={t('attrCustomValue')}
                    value={row.value}
                    onChange={(e) =>
                      onCustomRowsChange((prev) =>
                        prev.map((item, i) =>
                          i === index
                            ? { ...item, value: e.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="self-end"
                    onClick={() =>
                      onCustomRowsChange((prev) =>
                        prev.filter((_, i) => i !== index),
                      )
                    }
                  >
                    {t('delete')}
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onCustomRowsChange((prev) => [
                    ...prev,
                    { key: '', value: '' },
                  ])
                }
              >
                <Plus className="h-3.5 w-3.5" />
                {t('attrAddCustom')}
              </Button>
            </div>
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
              {isPending ? t('saving') : t('addProduct')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
