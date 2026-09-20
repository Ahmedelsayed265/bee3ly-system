import type { BusinessType } from '@/features/business/api'
import type { MessageKey } from '@/features/i18n/messages'

export type AttributeFieldKind = 'tags' | 'text' | 'number'

export type AttributeTemplateField = {
  key: string
  labelKey: MessageKey
  kind: AttributeFieldKind
  placeholderKey?: MessageKey
}

/** Physical catalog → quantity. Made-to-order / listings → available/unavailable. */
export function usesQuantityStock(type: BusinessType | string): boolean {
  return type !== 'REAL_ESTATE' && type !== 'RESTAURANT' && type !== 'CAFE'
}

/** Suggested detail fields per business type — merchants can still add custom keys. */
export const ATTRIBUTE_TEMPLATES: Record<
  BusinessType,
  AttributeTemplateField[]
> = {
  FASHION: [
    { key: 'sizes', labelKey: 'attrSizes', kind: 'tags', placeholderKey: 'attrSizesPlaceholder' },
    { key: 'colors', labelKey: 'attrColors', kind: 'tags', placeholderKey: 'attrColorsPlaceholder' },
    { key: 'material', labelKey: 'attrMaterial', kind: 'text' },
  ],
  PERFUME: [
    { key: 'sizes', labelKey: 'attrBottleSizes', kind: 'tags', placeholderKey: 'attrBottleSizesPlaceholder' },
    { key: 'notes', labelKey: 'attrNotes', kind: 'text' },
  ],
  BEAUTY: [
    { key: 'sizes', labelKey: 'attrSizes', kind: 'tags' },
    { key: 'skinType', labelKey: 'attrSkinType', kind: 'tags' },
    { key: 'shade', labelKey: 'attrShade', kind: 'tags' },
  ],
  RESTAURANT: [
    { key: 'portions', labelKey: 'attrPortions', kind: 'tags', placeholderKey: 'attrPortionsPlaceholder' },
    { key: 'extras', labelKey: 'attrExtras', kind: 'tags' },
  ],
  CAFE: [
    { key: 'sizes', labelKey: 'attrCupSizes', kind: 'tags', placeholderKey: 'attrCupSizesPlaceholder' },
    { key: 'extras', labelKey: 'attrExtras', kind: 'tags' },
  ],
  ECOMMERCE: [
    { key: 'variants', labelKey: 'attrVariants', kind: 'tags' },
    { key: 'sku', labelKey: 'attrSku', kind: 'text' },
  ],
  REAL_ESTATE: [
    { key: 'area_m2', labelKey: 'attrArea', kind: 'number' },
    { key: 'rooms', labelKey: 'attrRooms', kind: 'text' },
    { key: 'location', labelKey: 'attrLocation', kind: 'text' },
  ],
  OTHER: [
    { key: 'options', labelKey: 'attrOptions', kind: 'tags', placeholderKey: 'attrOptionsPlaceholder' },
  ],
}

export type ProductAttributeValue = string | number | boolean | string[]
export type ProductAttributes = Record<string, ProductAttributeValue>

export function parseTagsInput(value: string): string[] {
  return value
    .split(/[,،]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function formatAttributeValue(value: ProductAttributeValue): string {
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

const KNOWN_ATTR_LABELS: Record<string, MessageKey> = {
  sizes: 'attrSizes',
  colors: 'attrColors',
  material: 'attrMaterial',
  notes: 'attrNotes',
  skinType: 'attrSkinType',
  shade: 'attrShade',
  portions: 'attrPortions',
  extras: 'attrExtras',
  variants: 'attrVariants',
  sku: 'attrSku',
  area_m2: 'attrArea',
  rooms: 'attrRooms',
  location: 'attrLocation',
  options: 'attrOptions',
  flavors: 'attrFlavors',
  flavor: 'attrFlavors',
  protein_g: 'attrProtein',
  serving: 'attrServing',
}

export function attributeLabelKey(key: string): MessageKey | null {
  return KNOWN_ATTR_LABELS[key] ?? null
}

export function resolveAttributeEntries(
  attrs: Record<string, ProductAttributeValue>,
  businessType: BusinessType,
): Array<{ key: string; labelKey: MessageKey | null; value: string }> {
  const templateKeys = new Map(
    (ATTRIBUTE_TEMPLATES[businessType] ?? []).map((field) => [
      field.key,
      field.labelKey,
    ]),
  )

  return Object.entries(attrs)
    .filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'string') return value.trim().length > 0
      return typeof value === 'number' || typeof value === 'boolean'
    })
    .map(([key, value]) => ({
      key,
      labelKey: templateKeys.get(key) ?? attributeLabelKey(key),
      value: formatAttributeValue(value),
    }))
}

export function buildAttributesFromForm(input: {
  templateValues: Record<string, string>
  template: AttributeTemplateField[]
  customRows: Array<{ key: string; value: string }>
}): ProductAttributes {
  const attributes: ProductAttributes = {}

  for (const field of input.template) {
    const raw = (input.templateValues[field.key] ?? '').trim()
    if (!raw) continue
    if (field.kind === 'tags') {
      const tags = parseTagsInput(raw)
      if (tags.length) attributes[field.key] = tags
    } else if (field.kind === 'number') {
      const num = Number(raw)
      if (Number.isFinite(num)) attributes[field.key] = num
    } else {
      attributes[field.key] = raw
    }
  }

  for (const row of input.customRows) {
    const key = row.key.trim()
    const value = row.value.trim()
    if (!key || !value) continue
    const tags = parseTagsInput(value)
    attributes[key] = tags.length > 1 ? tags : value
  }

  return attributes
}
