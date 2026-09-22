import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import { TagsInput } from '@/components/ui/tags-input';
import type {
  BusinessType,
  Product,
  VariantDictionaryOption,
} from '@/features/business/api';
import { updateBusiness } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import { parseTagsInput } from '@/features/products/product-variants';
import {
  createDictionaryOptionId,
  dictionaryDraftsFromProducts,
  suggestedDictionarySeeds,
} from '@/features/products/variant-dictionary';

type DraftRow = {
  id: string;
  name: string;
  values: string[];
};

type VariantDictionaryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessType: BusinessType;
  initial: VariantDictionaryOption[];
  products: Product[];
  onSaved: (next: VariantDictionaryOption[]) => void;
};

function toDrafts(options: VariantDictionaryOption[]): DraftRow[] {
  return options.map((opt) => ({
    id: opt.id,
    name: opt.name,
    values: [...opt.values],
  }));
}

function seedRows(input: {
  initial: VariantDictionaryOption[];
  products: Product[];
  businessType: BusinessType;
  locale: 'ar' | 'en';
}): DraftRow[] {
  if (input.initial.length) return toDrafts(input.initial);

  const fromProducts = dictionaryDraftsFromProducts(
    input.products,
    input.locale,
  );
  const seeds = fromProducts.length
    ? fromProducts
    : suggestedDictionarySeeds(input.businessType, input.locale);

  return seeds.map((seed) => ({
    id: createDictionaryOptionId(),
    name: seed.name,
    values: parseTagsInput(seed.valuesInput),
  }));
}

export function VariantDictionaryDialog({
  open,
  onOpenChange,
  businessType,
  initial,
  products,
  onSaved,
}: VariantDictionaryDialogProps) {
  const { t, locale } = useLocale();
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRows(
      seedRows({
        initial,
        products,
        businessType,
        locale: locale === 'ar' ? 'ar' : 'en',
      }),
    );
    // Seed only when the dialog opens — avoid wiping edits on parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-gated hydrate
  }, [open]);

  const save = async () => {
    const cleaned: VariantDictionaryOption[] = rows
      .map((row) => ({
        id: row.id || createDictionaryOptionId(),
        name: row.name.trim(),
        values: [...new Set(row.values.map((v) => v.trim()).filter(Boolean))],
      }))
      .filter((row) => row.name && row.values.length);

    if (!cleaned.length) {
      toast.error(t('variantDictNeedOne'));
      return;
    }

    setPending(true);
    try {
      const business = await updateBusiness({ variantDictionary: cleaned });
      onSaved(asSaved(business.variantDictionary ?? cleaned));
      toast.success(t('profileSaved'));
      onOpenChange(false);
    } catch {
      toast.error(t('saveFailed'));
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('variantDictTitle')}</DialogTitle>
          <DialogDescription>{t('variantDictHint')}</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {rows.map((row, index) => (
            <div key={row.id} className="space-y-3">
              <div className="flex items-end gap-1">
                <InputField
                  id={`dict-name-${row.id}`}
                  containerClassName="min-w-0 flex-1"
                  label={t('variantAxisName')}
                  value={row.name}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, name: e.target.value } : item,
                      ),
                    )
                  }
                  placeholder={t('variantAxisNamePlaceholder')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="text-danger px-3 not-first:cursor-pointer hover:bg-danger/10 hover:text-danger shrink-0"
                  onClick={() =>
                    setRows((prev) => prev.filter((_, i) => i !== index))
                  }
                  aria-label={t('delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <TagsInput
                id={`dict-values-${row.id}`}
                label={t('variantAxisValues')}
                values={row.values}
                onChange={(values) =>
                  setRows((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, values } : item,
                    ),
                  )
                }
                placeholder={t('variantAxisValuesPlaceholder')}
              />
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setRows((prev) => [
                ...prev,
                {
                  id: createDictionaryOptionId(),
                  name: '',
                  values: [],
                },
              ])
            }
          >
            <Plus className="h-3.5 w-3.5" />
            {t('variantDictAdd')}
          </Button>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('cancel')}
          </Button>
          <Button type="button" disabled={pending} onClick={() => void save()}>
            {pending ? t('saving') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function asSaved(raw: unknown): VariantDictionaryOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as VariantDictionaryOption;
      if (!row.id || !row.name || !Array.isArray(row.values)) return null;
      return {
        id: String(row.id),
        name: String(row.name),
        values: row.values.map(String),
      };
    })
    .filter((item): item is VariantDictionaryOption => Boolean(item));
}
