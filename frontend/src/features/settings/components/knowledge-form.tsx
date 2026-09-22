import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { useLocale } from '@/features/i18n/locale-context';

type KnowledgeFormProps = {
  faqs: string;
  deliveryInfo: string;
  workingHours: string;
  paymentInfo: string;
  isSaving: boolean;
  onFaqsChange: (value: string) => void;
  onDeliveryInfoChange: (value: string) => void;
  onWorkingHoursChange: (value: string) => void;
  onPaymentInfoChange: (value: string) => void;
  onSave: () => void;
};

export function KnowledgeForm({
  faqs,
  deliveryInfo,
  workingHours,
  paymentInfo,
  isSaving,
  onFaqsChange,
  onDeliveryInfoChange,
  onWorkingHoursChange,
  onPaymentInfoChange,
  onSave,
}: KnowledgeFormProps) {
  const { t } = useLocale();

  return (
    <section className="border-border bg-surface w-full rounded-2xl border p-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <InputField
          id="hours"
          label={t('workingHours')}
          value={workingHours}
          onChange={(e) => onWorkingHoursChange(e.target.value)}
        />
        <InputField
          id="delivery"
          label={t('deliveryInfo')}
          value={deliveryInfo}
          onChange={(e) => onDeliveryInfoChange(e.target.value)}
        />
        <InputField
          id="payment"
          label={t('paymentInfo')}
          value={paymentInfo}
          onChange={(e) => onPaymentInfoChange(e.target.value)}
        />
        <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
          <label className="text-ink text-sm font-semibold">{t('faqs')}</label>
          <textarea
            className="border-border bg-input focus:border-brand/40 focus:ring-brand/20 min-h-36 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
            value={faqs}
            onChange={(e) => onFaqsChange(e.target.value)}
            placeholder={t('faqsPlaceholder')}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? t('saving') : t('save')}
        </Button>
      </div>
    </section>
  );
}
