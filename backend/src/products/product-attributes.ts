export type ProductAttributeValue = string | number | boolean | string[]
export type ProductAttributes = Record<string, ProductAttributeValue>

export function asAttributes(raw: unknown): ProductAttributes {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: ProductAttributes = {}
  for (const [rawKey, value] of Object.entries(raw as Record<string, unknown>)) {
    const key = rawKey.trim()
    if (!key) continue
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) out[key] = trimmed
      continue
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = value
      continue
    }
    if (typeof value === 'boolean') {
      out[key] = value
      continue
    }
    if (Array.isArray(value)) {
      const list = value
        .map((item) => String(item).trim())
        .filter(Boolean)
      if (list.length) out[key] = list
    }
  }
  return out
}

export function listAttributeOptions(
  attrs: ProductAttributes,
  key: string,
): string[] {
  const value = attrs[key]
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

export function syncLegacyArrays(attrs: ProductAttributes): {
  sizes: string[]
  colors: string[]
} {
  return {
    sizes: listAttributeOptions(attrs, 'sizes'),
    colors: listAttributeOptions(attrs, 'colors'),
  }
}

/** Merge explicit sizes/colors (API legacy) into attributes object. */
export function mergeLegacyIntoAttributes(
  attrs: ProductAttributes,
  sizes?: string[],
  colors?: string[],
): ProductAttributes {
  const next: ProductAttributes = { ...attrs }
  if (sizes !== undefined) {
    const cleaned = sizes.map((s) => s.trim()).filter(Boolean)
    if (cleaned.length) next.sizes = cleaned
    else delete next.sizes
  }
  if (colors !== undefined) {
    const cleaned = colors.map((c) => c.trim()).filter(Boolean)
    if (cleaned.length) next.colors = cleaned
    else delete next.colors
  }
  return asAttributes(next)
}

export function formatAttributesLine(attrs: ProductAttributes): string {
  const entries = Object.entries(attrs)
  if (!entries.length) return ''
  return entries
    .map(([key, value]) => {
      if (Array.isArray(value)) return `${key}: ${value.join(', ')}`
      return `${key}: ${String(value)}`
    })
    .join(' · ')
}
