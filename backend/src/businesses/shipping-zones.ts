export const GOVERNORATE_IDS = [
  'cairo',
  'giza',
  'alexandria',
  'qalyubia',
  'dakahlia',
  'sharqia',
  'gharbia',
  'monufia',
  'beheira',
  'kafr_el_sheikh',
  'damietta',
  'port_said',
  'ismailia',
  'suez',
  'north_sinai',
  'south_sinai',
  'red_sea',
  'fayoum',
  'beni_suef',
  'minya',
  'asyut',
  'sohag',
  'qena',
  'luxor',
  'aswan',
  'new_valley',
  'matrouh',
] as const;

export type GovernorateId = (typeof GOVERNORATE_IDS)[number];

export const GOVERNORATE_AR: Record<GovernorateId, string> = {
  cairo: 'القاهرة',
  giza: 'الجيزة',
  alexandria: 'الإسكندرية',
  qalyubia: 'القليوبية',
  dakahlia: 'الدقهلية',
  sharqia: 'الشرقية',
  gharbia: 'الغربية',
  monufia: 'المنوفية',
  beheira: 'البحيرة',
  kafr_el_sheikh: 'كفر الشيخ',
  damietta: 'دمياط',
  port_said: 'بورسعيد',
  ismailia: 'الإسماعيلية',
  suez: 'السويس',
  north_sinai: 'شمال سيناء',
  south_sinai: 'جنوب سيناء',
  red_sea: 'البحر الأحمر',
  fayoum: 'الفيوم',
  beni_suef: 'بني سويف',
  minya: 'المنيا',
  asyut: 'أسيوط',
  sohag: 'سوهاج',
  qena: 'قنا',
  luxor: 'الأقصر',
  aswan: 'أسوان',
  new_valley: 'الوادي الجديد',
  matrouh: 'مطروح',
};

export function formatShippingRates(zones: ShippingZone[]): string {
  return zones
    .map(
      (zone) =>
        `${zone.name} (${zone.governorates.map((id) => GOVERNORATE_AR[id]).join('، ')}): ${zone.priceEgp} EGP`,
    )
    .join('\n');
}

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
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, unknown>;
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const price = Number(item.priceEgp);
    const governorates = Array.isArray(item.governorates)
      ? item.governorates.filter(
          (value): value is GovernorateId =>
            typeof value === 'string' && ID_SET.has(value),
        )
      : [];
    if (!id || !name || !Number.isInteger(price) || price < 0) continue;
    zones.push({ id, name, governorates, priceEgp: price });
  }
  return zones;
}

export function zonePrice(
  zones: ShippingZone[],
  governorate: string | null | undefined,
): number | null {
  if (!governorate) return null;
  const zone = zones.find((item) =>
    item.governorates.includes(governorate as GovernorateId),
  );
  return zone ? zone.priceEgp : null;
}
