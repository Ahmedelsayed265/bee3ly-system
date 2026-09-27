import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GOVERNORATES,
  governorateLabel,
  newShippingZone,
  type ShippingZone,
} from '@/features/settings/governorates';
import { useLocale } from '@/features/i18n/locale-context';

type ShippingZonesFormProps = {
  zones: ShippingZone[];
  onChange: (zones: ShippingZone[]) => void;
};

export function ShippingZonesForm({ zones, onChange }: ShippingZonesFormProps) {
  const { locale, t } = useLocale();
  const used = new Set(zones.flatMap((zone) => zone.governorates));

  const update = (id: string, patch: Partial<ShippingZone>) => {
    onChange(
      zones.map((zone) => (zone.id === id ? { ...zone, ...patch } : zone)),
    );
  };

  return (
    <section className="border-border bg-surface space-y-4 rounded-2xl border p-5">
      <div>
        <h2 className="text-ink text-sm font-semibold">
          {t('shippingZonesTitle')}
        </h2>
        <p className="text-muted mt-1 text-xs leading-5">
          {t('shippingZonesHint')}
        </p>
      </div>

      {zones.map((zone) => {
        const available = GOVERNORATES.filter(
          (item) => !used.has(item.id) || zone.governorates.includes(item.id),
        );
        return (
          <div key={zone.id} className="bg-page space-y-3 rounded-xl p-4">
            <div className="flex flex-wrap items-start gap-2">
              <Input
                className="min-w-[140px] flex-1"
                placeholder={t('shippingZoneName')}
                value={zone.name}
                onChange={(e) => update(zone.id, { name: e.target.value })}
              />
              <Input
                type="number"
                min={0}
                className="w-28"
                placeholder={t('shippingZonePrice')}
                value={zone.priceEgp || ''}
                onChange={(e) =>
                  update(zone.id, {
                    priceEgp: Math.max(
                      0,
                      Math.floor(Number(e.target.value) || 0),
                    ),
                  })
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-danger shrink-0 px-2"
                onClick={() =>
                  onChange(zones.filter((item) => item.id !== zone.id))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {zone.governorates.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="bg-surface text-ink rounded-full px-2.5 py-1 text-[11px] font-medium"
                  onClick={() =>
                    update(zone.id, {
                      governorates: zone.governorates.filter(
                        (item) => item !== id,
                      ),
                    })
                  }
                >
                  {governorateLabel(id, locale)} ×
                </button>
              ))}
            </div>

            <Select
              key={`${zone.id}-${zone.governorates.join('-')}`}
              onValueChange={(id) => {
                if (
                  zone.governorates.includes(
                    id as (typeof zone.governorates)[number],
                  )
                ) {
                  return;
                }
                update(zone.id, {
                  governorates: [
                    ...zone.governorates,
                    id as (typeof zone.governorates)[number],
                  ],
                });
              }}
            >
              <SelectTrigger className="bg-surface w-full">
                <SelectValue placeholder={t('shippingZoneAddGovernorate')} />
              </SelectTrigger>
              <SelectContent>
                {available
                  .filter((item) => !zone.governorates.includes(item.id))
                  .map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {governorateLabel(item.id, locale)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => onChange([...zones, newShippingZone()])}
      >
        <Plus className="h-4 w-4" />
        {t('shippingZoneAdd')}
      </Button>
    </section>
  );
}
