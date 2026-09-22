import type {
  BusinessType,
  Product,
  VariantDictionaryOption,
} from '@/features/business/api';
import {
  asVariants,
  hasVariantMatrix,
  parseTagsInput,
} from '@/features/products/product-variants';

export function asVariantDictionary(raw: unknown): VariantDictionaryOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const id = String(row.id ?? '').trim();
      const name = String(row.name ?? '').trim();
      const values = Array.isArray(row.values)
        ? parseTagsInput(row.values.map(String).join(','))
        : typeof row.values === 'string'
          ? parseTagsInput(row.values)
          : [];
      if (!id || !name || !values.length) return null;
      return { id, name, values };
    })
    .filter((item): item is VariantDictionaryOption => Boolean(item));
}

export function createDictionaryOptionId(): string {
  return `opt_${Math.random().toString(36).slice(2, 10)}`;
}

function collectList(
  bag: Map<string, Set<string>>,
  name: string,
  values: string[],
) {
  if (!name.trim() || !values.length) return;
  const key = name.trim();
  if (!bag.has(key)) bag.set(key, new Set());
  for (const value of values) {
    const v = String(value).trim();
    if (v) bag.get(key)!.add(v);
  }
}

function listFromAttr(
  attrs: Record<string, unknown> | undefined,
  key: string,
): string[] {
  if (!attrs) return [];
  const value = attrs[key];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return parseTagsInput(value);
  return [];
}

/** Build dictionary drafts from existing catalog (attributes + variant axes). */
export function dictionaryDraftsFromProducts(
  products: Product[],
  locale: 'ar' | 'en',
): Array<{ name: string; valuesInput: string }> {
  const ar = locale === 'ar';
  const bag = new Map<string, Set<string>>();

  for (const product of products) {
    const attrs = (product.attributes ?? {}) as Record<string, unknown>;
    const variants = asVariants(product.variants);

    if (hasVariantMatrix(variants)) {
      for (const axis of variants.axes) {
        collectList(bag, axis.name, axis.values);
      }
    }

    collectList(
      bag,
      ar ? 'مقاس' : 'Size',
      product.sizes?.length ? product.sizes : listFromAttr(attrs, 'sizes'),
    );
    collectList(
      bag,
      ar ? 'لون' : 'Color',
      product.colors?.length ? product.colors : listFromAttr(attrs, 'colors'),
    );
    collectList(bag, ar ? 'نكهة' : 'Flavor', listFromAttr(attrs, 'flavors'));
    collectList(bag, ar ? 'درجة' : 'Shade', listFromAttr(attrs, 'shade'));
    collectList(bag, ar ? 'خيار' : 'Option', listFromAttr(attrs, 'options'));
  }

  return [...bag.entries()]
    .filter(([, values]) => values.size > 0)
    .map(([name, values]) => ({
      name,
      valuesInput: [...values].join(', '),
    }));
}

/** Seed suggestions when dictionary is empty — merchant still edits freely. */
export function suggestedDictionarySeeds(
  businessType: BusinessType,
  locale: 'ar' | 'en',
): Array<{ name: string; valuesInput: string }> {
  const ar = locale === 'ar';
  switch (businessType) {
    case 'FASHION':
      return [
        { name: ar ? 'مقاس' : 'Size', valuesInput: 'S, M, L, XL' },
        {
          name: ar ? 'لون' : 'Color',
          valuesInput: ar ? 'أسود, أبيض' : 'Black, White',
        },
      ];
    case 'ECOMMERCE':
      return [
        { name: ar ? 'مقاس' : 'Size', valuesInput: '1kg, 2kg' },
        {
          name: ar ? 'نكهة' : 'Flavor',
          valuesInput: ar ? 'شوكولاتة, فانيليا' : 'Chocolate, Vanilla',
        },
      ];
    case 'PERFUME':
      return [{ name: ar ? 'حجم' : 'Size', valuesInput: '50ml, 100ml' }];
    case 'BEAUTY':
      return [
        { name: ar ? 'مقاس' : 'Size', valuesInput: '30ml, 50ml' },
        {
          name: ar ? 'درجة' : 'Shade',
          valuesInput: ar ? 'فاتح, غامق' : 'Light, Dark',
        },
      ];
    case 'CAFE':
    case 'RESTAURANT':
      return [
        {
          name: ar ? 'حجم' : 'Size',
          valuesInput: ar ? 'صغير, وسط, كبير' : 'Small, Medium, Large',
        },
      ];
    default:
      return [
        {
          name: ar ? 'خيار' : 'Option',
          valuesInput: ar ? 'أ, ب' : 'A, B',
        },
      ];
  }
}
