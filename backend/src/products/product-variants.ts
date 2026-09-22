export type ProductVariantAxis = {
  name: string;
  values: string[];
};

export type ProductVariantSku = {
  /** Stable key: name=value|name=value (sorted) */
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

const SIZE_AXIS_NAMES = new Set([
  'size',
  'sizes',
  'مقاس',
  'مقاسات',
  'حجم',
  'احجام',
  'أحجام',
]);
const COLOR_AXIS_NAMES = new Set([
  'color',
  'colors',
  'لون',
  'الوان',
  'ألوان',
  'لونين',
]);

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
      values: [
        ...new Set(axis.values.map((v) => String(v).trim()).filter(Boolean)),
      ],
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
        ? [
            ...new Set(
              row.values.map((v) => String(v).trim()).filter(Boolean),
            ),
          ]
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
        row.options && typeof row.options === 'object' && !Array.isArray(row.options)
          ? (row.options as Record<string, unknown>)
          : {};
      const options: Record<string, string> = {};
      for (const [k, v] of Object.entries(optionsRaw)) {
        const key = k.trim();
        const value = String(v ?? '').trim();
        if (key && value) options[key] = value;
      }
      if (!Object.keys(options).length) return null;
      const priceEgp = Math.max(0, Math.floor(Number(row.priceEgp ?? 0)));
      const stockQuantity = Math.max(
        0,
        Math.floor(Number(row.stockQuantity ?? 0)),
      );
      return {
        key: String(row.key ?? '').trim() || variantSkuKey(options),
        options,
        priceEgp,
        stockQuantity,
      };
    })
    .filter((item): item is ProductVariantSku => Boolean(item));

  return { axes, skus };
}

/** Rebuild SKUs from axes, preserving price/qty when option key matches. */
export function rebuildVariantSkus(input: {
  axes: ProductVariantAxis[];
  previousSkus?: ProductVariantSku[];
  defaultPriceEgp: number;
  defaultStockQuantity?: number;
  maxCombinations?: number;
}): ProductVariants {
  const axes = input.axes
    .map((axis) => ({
      name: axis.name.trim(),
      values: [
        ...new Set(axis.values.map((v) => String(v).trim()).filter(Boolean)),
      ],
    }))
    .filter((axis) => axis.name && axis.values.length > 0);

  const combos = cartesianOptions(axes);
  const max = input.maxCombinations ?? 100;
  const limited = combos.slice(0, max);
  const prevByKey = new Map(
    (input.previousSkus ?? []).map((sku) => [sku.key || variantSkuKey(sku.options), sku]),
  );
  const defaultPrice = Math.max(0, Math.floor(Number(input.defaultPriceEgp ?? 0)));
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

export function variantsTotalStock(variants: ProductVariants): number {
  return variants.skus.reduce((sum, sku) => sum + sku.stockQuantity, 0);
}

/** Display / base price: first SKU when matrix exists. */
export function variantsFirstPrice(variants: ProductVariants): number | null {
  if (!variants.skus.length) return null;
  return variants.skus[0]!.priceEgp;
}

export function hasVariantMatrix(variants: ProductVariants): boolean {
  return variants.axes.length > 0 && variants.skus.length > 0;
}

export function axisValuesByKind(variants: ProductVariants): {
  sizes: string[];
  colors: string[];
} {
  const sizes: string[] = [];
  const colors: string[] = [];
  for (const axis of variants.axes) {
    const lower = axis.name.trim().toLowerCase();
    if (SIZE_AXIS_NAMES.has(lower) || SIZE_AXIS_NAMES.has(axis.name.trim())) {
      sizes.push(...axis.values);
    }
    if (COLOR_AXIS_NAMES.has(lower) || COLOR_AXIS_NAMES.has(axis.name.trim())) {
      colors.push(...axis.values);
    }
  }
  return {
    sizes: [...new Set(sizes)],
    colors: [...new Set(colors)],
  };
}

export function formatVariantLabel(options: Record<string, string>): string {
  return Object.entries(options)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');
}

export function formatVariantsSummary(variants: ProductVariants): string {
  if (!hasVariantMatrix(variants)) return '';
  const axes = variants.axes
    .map((axis) => `${axis.name}: ${axis.values.join(', ')}`)
    .join(' · ');
  return `${variants.skus.length} variants (${axes})`;
}

/**
 * Match a SKU from chosen option values (by axis name or common aliases).
 */
export function findMatchingSku(
  variants: ProductVariants,
  chosen: Record<string, string | null | undefined>,
): ProductVariantSku | null {
  if (!hasVariantMatrix(variants)) return null;

  const normalizedChosen: Record<string, string> = {};
  for (const [k, v] of Object.entries(chosen)) {
    const value = String(v ?? '').trim();
    if (!value) continue;
    normalizedChosen[k.trim().toLowerCase()] = value;
  }

  for (const sku of variants.skus) {
    const ok = variants.axes.every((axis) => {
      const want = sku.options[axis.name];
      if (!want) return false;
      const aliases = [axis.name, ...aliasKeysForAxis(axis.name)];
      const got = aliases
        .map((a) => normalizedChosen[a.toLowerCase()])
        .find(Boolean);
      return got === want;
    });
    if (ok) return sku;
  }
  return null;
}

function aliasKeysForAxis(name: string): string[] {
  const lower = name.trim().toLowerCase();
  if (SIZE_AXIS_NAMES.has(lower) || SIZE_AXIS_NAMES.has(name.trim())) {
    return ['size', 'sizes', 'مقاس', 'مقاسات'];
  }
  if (COLOR_AXIS_NAMES.has(lower) || COLOR_AXIS_NAMES.has(name.trim())) {
    return ['color', 'colors', 'لون', 'ألوان', 'الوان'];
  }
  if (lower.includes('flavor') || name.includes('نكه')) {
    return ['flavor', 'flavors', 'نكهة', 'نكهات'];
  }
  return [];
}

/** Patch one SKU stock inside variants payload. */
export function patchVariantStock(
  variants: ProductVariants,
  skuKey: string,
  nextQty: number,
): ProductVariants {
  const qty = Math.max(0, Math.floor(nextQty));
  return {
    ...variants,
    skus: variants.skus.map((sku) =>
      sku.key === skuKey ? { ...sku, stockQuantity: qty } : sku,
    ),
  };
}
