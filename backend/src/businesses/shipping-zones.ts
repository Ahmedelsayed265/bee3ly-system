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
  priceEgp: number;
};

const ID_SET = new Set<string>(GOVERNORATE_IDS);

export function parseShippingZones(raw: unknown): ShippingZone[] {
  if (!Array.isArray(raw)) return [];
  const zones: ShippingZone[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const item = row as Record<string, unknown>;
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const price = Math.max(0, Math.floor(Number(item.priceEgp ?? 0)));
    const governorates = Array.isArray(item.governorates)
      ? item.governorates.filter(
          (value): value is GovernorateId =>
            typeof value === 'string' && ID_SET.has(value),
        )
      : [];
    if (!id || !name || governorates.length === 0) continue;
    zones.push({ id, name, governorates, priceEgp: price });
  }
  return zones;
}

export function shippingPriceForGovernorate(
  zones: ShippingZone[],
  governorate: string | null | undefined,
): number | null {
  if (!governorate) return null;
  const match = zones.find((item) =>
    item.governorates.includes(governorate as GovernorateId),
  );
  return match?.priceEgp ?? null;
}

export function formatShippingZonesForKnowledge(zones: ShippingZone[]): string {
  if (!zones.length) return '';
  return zones
    .map(
      (zone) =>
        `${zone.name} (${zone.governorates.map((id) => GOVERNORATE_AR[id]).join('، ')}): ${zone.priceEgp} ج.م`,
    )
    .join('\n');
}
