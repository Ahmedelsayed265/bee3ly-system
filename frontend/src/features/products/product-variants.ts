import type { BusinessType } from '@/features/business/api';
import type { MessageKey } from '@/features/i18n/messages';

export type ProductVariantAxis = {
  name: string;
  values: string[];
};

export type ProductVariantSku = {
  key: string;
  options: Record<string, string>;
  priceEgp: number;
  stockQuantity: number;
};

export type ProductVariants = {
  axes: ProductVariantAxis[];
  skus: ProductVariantSku[];
};

export const EMPTY_VARIANTS: ProductVariants = { axes: [], skus: [] };

export type SuggestedVariantAxis = {
  nameKey: MessageKey;
  defaultNameAr: string;
  defaultNameEn: string;
  placeholderKey: MessageKey;
};

/** Suggested axis names per business — merchant can rename freely. */
export const SUGGESTED_VARIANT_AXES: Partial<
  Record<BusinessType, SuggestedVariantAxis[]>
> = {
  FASHION: [
    {
      nameKey: 'attrSizes',
      defaultNameAr: 'مقاس',
      defaultNameEn: 'Size',
      placeholderKey: 'attrSizesPlaceholder',
    },
    {
      nameKey: 'attrColors',
      defaultNameAr: 'لون',
      defaultNameEn: 'Color',
      placeholderKey: 'attrColorsPlaceholder',
    },
  ],
  PERFUME: [
    {
      nameKey: 'attrBottleSizes',
      defaultNameAr: 'حجم',
      defaultNameEn: 'Size',
      placeholderKey: 'attrBottleSizesPlaceholder',
    },
  ],
  BEAUTY: [
    {
      nameKey: 'attrSizes',
      defaultNameAr: 'مقاس',
      defaultNameEn: 'Size',
      placeholderKey: 'attrSizesPlaceholder',
    },
    {
      nameKey: 'attrShade',
      defaultNameAr: 'درجة',
      defaultNameEn: 'Shade',
      placeholderKey: 'attrShade',
    },
  ],
  ECOMMERCE: [
    {
      nameKey: 'attrSizes',
      defaultNameAr: 'مقاس',
      defaultNameEn: 'Size',
      placeholderKey: 'attrSizesPlaceholder',
    },
    {
      nameKey: 'attrFlavors',
      defaultNameAr: 'نكهة',
      defaultNameEn: 'Flavor',
      placeholderKey: 'attrFlavorsPlaceholder',
    },
  ],
  RESTAURANT: [
    {
      nameKey: 'attrPortions',
      defaultNameAr: 'حجم',
      defaultNameEn: 'Portion',
      placeholderKey: 'attrPortionsPlaceholder',
    },
  ],
  CAFE: [
    {
      nameKey: 'attrCupSizes',
      defaultNameAr: 'حجم',
      defaultNameEn: 'Size',
      placeholderKey: 'attrCupSizesPlaceholder',
    },
  ],
  OTHER: [
    {
      nameKey: 'attrOptions',
      defaultNameAr: 'خيار',
      defaultNameEn: 'Option',
      placeholderKey: 'attrOptionsPlaceholder',
    },
  ],
};

export function parseTagsInput(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,،]/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ];
}

export function variantSkuKey(options: Record<string, string>): string {
  return Object.entries(options)
    .map(([k, v]) => [k.trim(), String(v).trim()] as const)
    .filter(([k, v]) => k && v)
    .sort(([a], [b]) => a.localeCompare(b, 'ar'))
    .map(([k, v]) => `${k}=${v}`)
    .join('|');
}

export function cartesianOptions(
  axes: ProductVariantAxis[],
): Array<Record<string, string>> {
  const cleaned = axes
    .map((axis) => ({
      name: axis.name.trim(),
      values: parseTagsInput(axis.values.join(',')),
    }))
    .filter((axis) => axis.name && axis.values.length > 0);

  if (!cleaned.length) return [];

  return cleaned.reduce<Array<Record<string, string>>>((acc, axis) => {
    if (!acc.length) {
      return axis.values.map((value) => ({ [axis.name]: value }));
    }
    return acc.flatMap((combo) =>
      axis.values.map((value) => ({ ...combo, [axis.name]: value })),
    );
  }, []);
}

export function asVariants(raw: unknown): ProductVariants {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...EMPTY_VARIANTS };
  }
  const data = raw as Record<string, unknown>;
  const axesRaw = Array.isArray(data.axes) ? data.axes : [];
  const skusRaw = Array.isArray(data.skus) ? data.skus : [];

  const axes: ProductVariantAxis[] = axesRaw
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const name = String(row.name ?? '').trim();
      const values = Array.isArray(row.values)
        ? parseTagsInput(row.values.map(String).join(','))
        : [];
      if (!name || !values.length) return null;
      return { name, values };
    })
    .filter((item): item is ProductVariantAxis => Boolean(item));

  const skus: ProductVariantSku[] = skusRaw
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const optionsRaw =
        row.options &&
        typeof row.options === 'object' &&
        !Array.isArray(row.options)
          ? (row.options as Record<string, unknown>)
          : {};
      const options: Record<string, string> = {};
      for (const [k, v] of Object.entries(optionsRaw)) {
        const key = k.trim();
        const value = String(v ?? '').trim();
        if (key && value) options[key] = value;
      }
      if (!Object.keys(options).length) return null;
      return {
        key: String(row.key ?? '').trim() || variantSkuKey(options),
        options,
        priceEgp: Math.max(0, Math.floor(Number(row.priceEgp ?? 0))),
        stockQuantity: Math.max(0, Math.floor(Number(row.stockQuantity ?? 0))),
      };
    })
    .filter((item): item is ProductVariantSku => Boolean(item));

  return { axes, skus };
}

export function rebuildVariantSkus(input: {
  axes: Array<{ name: string; valuesInput: string }>;
  previousSkus?: ProductVariantSku[];
  defaultPriceEgp: number;
  defaultStockQuantity?: number;
  maxCombinations?: number;
}): ProductVariants {
  const axes: ProductVariantAxis[] = input.axes
    .map((axis) => ({
      name: axis.name.trim(),
      values: parseTagsInput(axis.valuesInput),
    }))
    .filter((axis) => axis.name && axis.values.length > 0);

  const combos = cartesianOptions(axes);
  const max = input.maxCombinations ?? 100;
  const limited = combos.slice(0, max);
  const prevByKey = new Map(
    (input.previousSkus ?? []).map((sku) => [
      sku.key || variantSkuKey(sku.options),
      sku,
    ]),
  );
  const defaultPrice = Math.max(
    0,
    Math.floor(Number(input.defaultPriceEgp ?? 0)),
  );
  const defaultStock = Math.max(
    0,
    Math.floor(Number(input.defaultStockQuantity ?? 0)),
  );

  const skus: ProductVariantSku[] = limited.map((options) => {
    const key = variantSkuKey(options);
    const prev = prevByKey.get(key);
    return {
      key,
      options,
      priceEgp: prev?.priceEgp ?? defaultPrice,
      stockQuantity: prev?.stockQuantity ?? defaultStock,
    };
  });

  return { axes, skus };
}

export function hasVariantMatrix(variants: ProductVariants): boolean {
  return variants.axes.length > 0 && variants.skus.length > 0;
}

export function formatVariantLabel(options: Record<string, string>): string {
  return Object.entries(options)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');
}

export function variantsTotalStock(variants: ProductVariants): number {
  return variants.skus.reduce((sum, sku) => sum + sku.stockQuantity, 0);
}
