export const GOVERNORATE_IDS = [
  'cairo',
  'giza',
  'alexandria',
  'qalyubia',
  'sharqia',
  'gharbia',
  'monufia',
  'dakahlia',
  'beheira',
  'kafr_el_sheikh',
  'damietta',
  'port_said',
  'ismailia',
  'suez',
  'fayoum',
  'beni_suef',
  'minya',
  'asyut',
  'sohag',
  'qena',
  'luxor',
  'aswan',
  'red_sea',
  'new_valley',
  'matrouh',
  'north_sinai',
  'south_sinai',
] as const;

export type GovernorateId = (typeof GOVERNORATE_IDS)[number];

export type ShippingPricingMode = 'GOVERNORATE' | 'LOCAL_AREA';

export const GOVERNORATE_AR: Record<GovernorateId, string> = {
  cairo: 'القاهرة',
  giza: 'الجيزة',
  alexandria: 'الإسكندرية',
  qalyubia: 'القليوبية',
  sharqia: 'الشرقية',
  gharbia: 'الغربية',
  monufia: 'المنوفية',
  dakahlia: 'الدقهلية',
  beheira: 'البحيرة',
  kafr_el_sheikh: 'كفر الشيخ',
  damietta: 'دمياط',
  port_said: 'بورسعيد',
  ismailia: 'الإسماعيلية',
  suez: 'السويس',
  fayoum: 'الفيوم',
  beni_suef: 'بني سويف',
  minya: 'المنيا',
  asyut: 'أسيوط',
  sohag: 'سوهاج',
  qena: 'قنا',
  luxor: 'الأقصر',
  aswan: 'أسوان',
  red_sea: 'البحر الأحمر',
  new_valley: 'الوادي الجديد',
  matrouh: 'مرسى مطروح',
  north_sinai: 'شمال سيناء',
  south_sinai: 'جنوب سيناء',
};

export type ShippingZone = {
  id: string;
  name: string;
  governorates: GovernorateId[];
  /** Extra spellings for LOCAL_AREA mode only */
  areas: string[];
  priceEgp: number;
};

const ID_SET = new Set<string>(GOVERNORATE_IDS);

export function normalizeAreaText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ');
}

function textMatchesArea(haystack: string, needle: string): boolean {
  const h = normalizeAreaText(haystack);
  const n = normalizeAreaText(needle);
  if (!n || !h) return false;
  return h.includes(n) || n.includes(h);
}

export type ShippingLookup = {
  governorate?: string | null;
  deliveryArea?: string | null;
  address?: string | null;
};

export function parseShippingZones(
  raw: unknown,
  mode: ShippingPricingMode = 'GOVERNORATE',
): ShippingZone[] {
  if (!Array.isArray(raw)) return [];
  const zones: ShippingZone[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const item = row as Record<string, unknown>;
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const price = Math.max(0, Math.floor(Number(item.priceEgp ?? 0)));
    if (!id || !name) continue;

    if (mode === 'LOCAL_AREA') {
      const areas = Array.isArray(item.areas)
        ? item.areas
            .filter((value): value is string => typeof value === 'string')
            .map((value) => value.trim())
            .filter(Boolean)
        : [];
      zones.push({ id, name, governorates: [], areas, priceEgp: price });
      continue;
    }

    const governorates = Array.isArray(item.governorates)
      ? item.governorates.filter(
          (value): value is GovernorateId =>
            typeof value === 'string' && ID_SET.has(value),
        )
      : [];
    if (governorates.length === 0) continue;
    zones.push({ id, name, governorates, areas: [], priceEgp: price });
  }
  return zones;
}

export function findShippingZone(
  zones: ShippingZone[],
  mode: ShippingPricingMode,
  lookup: ShippingLookup,
): ShippingZone | null {
  if (mode === 'GOVERNORATE') {
    const governorate = lookup.governorate?.trim() || null;
    if (
      !governorate ||
      !GOVERNORATE_IDS.includes(governorate as GovernorateId)
    ) {
      return null;
    }
    return (
      zones.find((z) =>
        z.governorates.includes(governorate as GovernorateId),
      ) ?? null
    );
  }

  const areaBlob = [lookup.deliveryArea, lookup.address]
    .filter((v): v is string => typeof v === 'string' && Boolean(v.trim()))
    .join(' ');
  if (!areaBlob.trim()) return null;

  for (const zone of zones) {
    if (textMatchesArea(areaBlob, zone.name)) return zone;
    for (const area of zone.areas) {
      if (textMatchesArea(areaBlob, area)) return zone;
    }
  }
  return null;
}

export function shippingPriceForGovernorate(
  zones: ShippingZone[],
  governorate: string | null | undefined,
): number | null {
  const zone = findShippingZone(zones, 'GOVERNORATE', { governorate });
  return zone?.priceEgp ?? null;
}

export function resolveShippingQuote(
  zones: ShippingZone[],
  mode: ShippingPricingMode,
  lookup: ShippingLookup,
):
  | { ok: true; zone: ShippingZone | null; priceEgp: number }
  | { ok: false; message: string } {
  if (!zones.length) {
    return { ok: true, zone: null, priceEgp: 0 };
  }

  if (mode === 'GOVERNORATE') {
    const governorate = lookup.governorate?.trim() || null;
    if (!governorate) {
      return {
        ok: false,
        message:
          'Governorate required — ask customer which governorate (use id: cairo, giza, …)',
      };
    }
    if (!GOVERNORATE_IDS.includes(governorate as GovernorateId)) {
      return { ok: false, message: 'Invalid governorate id' };
    }
    const zone = findShippingZone(zones, mode, lookup);
    if (!zone) {
      return {
        ok: false,
        message: 'Governorate not in any shipping zone',
      };
    }
    return { ok: true, zone, priceEgp: zone.priceEgp };
  }

  const zone = findShippingZone(zones, mode, lookup);
  if (!zone) {
    const options = zones
      .flatMap((z) => [z.name, ...z.areas])
      .filter(Boolean)
      .join('، ');
    return {
      ok: false,
      message: `Delivery city/area required — ask customer (e.g. ${options}) and pass deliveryArea with their answer`,
    };
  }
  return { ok: true, zone, priceEgp: zone.priceEgp };
}

export function formatShippingZonesForKnowledge(
  zones: ShippingZone[],
  mode: ShippingPricingMode,
): string {
  if (!zones.length) return '';
  if (mode === 'LOCAL_AREA') {
    const lines = zones.map(
      (zone) =>
        `${zone.name}${zone.areas.length ? ` (also: ${zone.areas.join('، ')})` : ''}: ${zone.priceEgp} ج.م`,
    );
    return `${lines.join('\n')}\n[LOCAL DELIVERY ONLY] Pricing is by city/district name — ask «إنت في أنهي منطقة؟» / which area; pass deliveryArea in tools. Do NOT ask for governorate ids.`;
  }
  return zones
    .map(
      (zone) =>
        `${zone.name} (${zone.governorates.map((id) => GOVERNORATE_AR[id]).join('، ')}): ${zone.priceEgp} ج.م`,
    )
    .join('\n');
}

export function listDeliveryAreaHints(zones: ShippingZone[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const zone of zones) {
    for (const label of [zone.name, ...zone.areas]) {
      const key = normalizeAreaText(label);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(label);
    }
  }
  return out;
}
