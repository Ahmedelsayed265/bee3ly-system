import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/features/i18n/locale-context';
import {
  GOVERNORATES,
  governorateLabel,
  type GovernorateId,
  type ShippingZone,
} from '@/features/settings/governorates';

type ShippingZonesFormProps = {
  zones: ShippingZone[];
  isSaving: boolean;
  onChange: (zones: ShippingZone[]) => void;
  onSave: () => void;
};

export function ShippingZonesForm({
  zones,
  isSaving,
  onChange,
  onSave,
}: ShippingZonesFormProps) {
  const { locale, t } = useLocale();
  const used = new Set(zones.flatMap((zone) => zone.governorates));

  const update = (id: string, patch: Partial<ShippingZone>) => {
    onChange(
      zones.map((zone) => (zone.id === id ? { ...zone, ...patch } : zone)),
    );
  };

  return (
    <form
      className="border-border bg-surface flex flex-col gap-4 rounded-2xl border p-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div>
        <h2 className="text-ink text-lg font-bold">
          {t('shippingZonesTitle')}
        </h2>
        <p className="text-muted mt-1 text-sm leading-6">
          {t('shippingZonesHint')}
        </p>
      </div>

      {zones.map((zone) => {
        const available = GOVERNORATES.filter(
          (item) => !used.has(item.id) || zone.governorates.includes(item.id),
        );
        return (
          <div key={zone.id} className="bg-page space-y-3 rounded-xl p-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_auto]">
              <Input
                value={zone.name}
                placeholder={t('shippingZoneName')}
                onChange={(event) =>
                  update(zone.id, { name: event.target.value })
                }
                required
              />
              <Input
                type="number"
                min={0}
                step={1}
                value={String(zone.priceEgp)}
                onChange={(event) =>
                  update(zone.id, {
                    priceEgp: Math.max(
                      0,
                      Math.floor(Number(event.target.value) || 0),
                    ),
                  })
                }
                required
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  onChange(zones.filter((item) => item.id !== zone.id))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {zone.governorates.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="bg-brand/10 text-brand rounded-full px-2.5 py-1 text-xs font-semibold"
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
            <select
              className="border-border bg-surface text-ink h-10 w-full rounded-xl border px-3 text-sm"
              value=""
              onChange={(event) => {
                const id = event.target.value as GovernorateId;
                if (!id || zone.governorates.includes(id)) return;
                update(zone.id, { governorates: [...zone.governorates, id] });
              }}
            >
              <option value="">{t('shippingAddGovernorate')}</option>
              {available
                .filter((item) => !zone.governorates.includes(item.id))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {locale === 'ar' ? item.ar : item.en}
                  </option>
                ))}
            </select>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onChange([
              ...zones,
              {
                id: crypto.randomUUID(),
                name: '',
                governorates: [],
                priceEgp: 0,
              },
            ])
          }
        >
          <Plus className="h-4 w-4" />
          {t('shippingAddZone')}
        </Button>
        <Button type="submit" disabled={isSaving}>
          {t('save')}
        </Button>
      </div>
    </form>
  );
}
