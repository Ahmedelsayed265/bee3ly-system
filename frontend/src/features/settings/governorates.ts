export const GOVERNORATES = [
  { id: 'cairo', ar: 'القاهرة', en: 'Cairo' },
  { id: 'giza', ar: 'الجيزة', en: 'Giza' },
  { id: 'alexandria', ar: 'الإسكندرية', en: 'Alexandria' },
  { id: 'qalyubia', ar: 'القليوبية', en: 'Qalyubia' },
  { id: 'dakahlia', ar: 'الدقهلية', en: 'Dakahlia' },
  { id: 'sharqia', ar: 'الشرقية', en: 'Sharqia' },
  { id: 'gharbia', ar: 'الغربية', en: 'Gharbia' },
  { id: 'monufia', ar: 'المنوفية', en: 'Monufia' },
  { id: 'beheira', ar: 'البحيرة', en: 'Beheira' },
  { id: 'kafr_el_sheikh', ar: 'كفر الشيخ', en: 'Kafr El Sheikh' },
  { id: 'damietta', ar: 'دمياط', en: 'Damietta' },
  { id: 'port_said', ar: 'بورسعيد', en: 'Port Said' },
  { id: 'ismailia', ar: 'الإسماعيلية', en: 'Ismailia' },
  { id: 'suez', ar: 'السويس', en: 'Suez' },
  { id: 'north_sinai', ar: 'شمال سيناء', en: 'North Sinai' },
  { id: 'south_sinai', ar: 'جنوب سيناء', en: 'South Sinai' },
  { id: 'red_sea', ar: 'البحر الأحمر', en: 'Red Sea' },
  { id: 'fayoum', ar: 'الفيوم', en: 'Fayoum' },
  { id: 'beni_suef', ar: 'بني سويف', en: 'Beni Suef' },
  { id: 'minya', ar: 'المنيا', en: 'Minya' },
  { id: 'asyut', ar: 'أسيوط', en: 'Asyut' },
  { id: 'sohag', ar: 'سوهاج', en: 'Sohag' },
  { id: 'qena', ar: 'قنا', en: 'Qena' },
  { id: 'luxor', ar: 'الأقصر', en: 'Luxor' },
  { id: 'aswan', ar: 'أسوان', en: 'Aswan' },
  { id: 'new_valley', ar: 'الوادي الجديد', en: 'New Valley' },
  { id: 'matrouh', ar: 'مطروح', en: 'Matrouh' },
] as const;

export type GovernorateId = (typeof GOVERNORATES)[number]['id'];

export type ShippingZone = {
  id: string;
  name: string;
  governorates: GovernorateId[];
  priceEgp: number;
};

const IDS = new Set<string>(GOVERNORATES.map((item) => item.id));

export function governorateLabel(id: string, locale: string) {
  const row = GOVERNORATES.find((item) => item.id === id);
  if (!row) return id;
  return locale === 'ar' ? row.ar : row.en;
}

export function parseShippingZones(raw: unknown): ShippingZone[] {
  if (!Array.isArray(raw)) return [];
  const zones: ShippingZone[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, unknown>;
    const id = typeof item.id === 'string' ? item.id : '';
    const name = typeof item.name === 'string' ? item.name : '';
    const price = Number(item.priceEgp);
    const governorates = Array.isArray(item.governorates)
      ? item.governorates.filter(
          (value): value is GovernorateId =>
            typeof value === 'string' && IDS.has(value),
        )
      : [];
    if (!id) continue;
    zones.push({
      id,
      name,
      governorates,
      priceEgp: Number.isFinite(price) ? Math.max(0, Math.floor(price)) : 0,
    });
  }
  return zones;
}
