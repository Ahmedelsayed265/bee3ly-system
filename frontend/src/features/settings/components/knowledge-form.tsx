import { Plus, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import {
  PAYMENT_METHODS,
  WEEK_DAYS,
  parseDelivery,
  parseFaqs,
  parseHours,
  parsePayment,
  serializeDelivery,
  serializeFaqs,
  serializeHours,
  serializePayment,
  type DeliveryDraft,
  type FaqDraft,
  type HoursDraft,
  type PaymentMethod,
  type WeekDay,
} from '@/features/settings/knowledge-draft';
import { cn } from '@/lib/utils';

const DAY_LABEL: Record<WeekDay, MessageKey> = {
  sat: 'daySat',
  sun: 'daySun',
  mon: 'dayMon',
  tue: 'dayTue',
  wed: 'dayWed',
  thu: 'dayThu',
  fri: 'dayFri',
};

const PAYMENT_LABEL: Record<PaymentMethod, MessageKey> = {
  cod: 'payCod',
  vodafone: 'payVodafone',
  instapay: 'payInstapay',
  card: 'payCard',
  bank: 'payBank',
};

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

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="border-border bg-surface space-y-4 rounded-2xl border p-5">
      <div>
        <h2 className="text-ink text-sm font-semibold">{title}</h2>
        <p className="text-muted mt-1 text-xs leading-5">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function MiniLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-muted mb-1.5 block text-xs font-semibold"
    >
      {children}
    </label>
  );
}

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
  const [hours, setHours] = useState<HoursDraft>(() =>
    parseHours(workingHours),
  );
  const [delivery, setDelivery] = useState<DeliveryDraft>(() =>
    parseDelivery(deliveryInfo),
  );
  const [methods, setMethods] = useState<PaymentMethod[]>(() =>
    parsePayment(paymentInfo),
  );
  const [faqItems, setFaqItems] = useState<FaqDraft[]>(() => parseFaqs(faqs));

  const updateHours = (next: HoursDraft) => {
    setHours(next);
    onWorkingHoursChange(serializeHours(next));
  };

  const updateDelivery = (next: DeliveryDraft) => {
    setDelivery(next);
    onDeliveryInfoChange(serializeDelivery(next));
  };

  const toggleDay = (day: WeekDay) => {
    const days = hours.days.includes(day)
      ? hours.days.filter((item) => item !== day)
      : WEEK_DAYS.filter((item) => item === day || hours.days.includes(item));
    updateHours({ ...hours, days });
  };

  const toggleMethod = (method: PaymentMethod) => {
    const next = methods.includes(method)
      ? methods.filter((item) => item !== method)
      : PAYMENT_METHODS.filter(
          (item) => item === method || methods.includes(item),
        );
    setMethods(next);
    onPaymentInfoChange(serializePayment(next));
  };

  const updateFaq = (id: string, patch: Partial<FaqDraft>) => {
    const next = faqItems.map((item) =>
      item.id === id ? { ...item, ...patch } : item,
    );
    setFaqItems(next);
    onFaqsChange(serializeFaqs(next));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <Section title={t('workingHours')} hint={t('workingHoursHint')}>
          <div className="flex flex-wrap gap-2">
            {WEEK_DAYS.map((day) => {
              const selected = hours.days.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleDay(day)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                    selected
                      ? 'border-brand bg-brand text-white'
                      : 'border-border text-muted hover:text-ink',
                  )}
                >
                  {t(DAY_LABEL[day])}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <MiniLabel htmlFor="hours-open">{t('hoursFrom')}</MiniLabel>
              <Input
                id="hours-open"
                type="time"
                value={hours.open}
                onChange={(e) =>
                  updateHours({ ...hours, open: e.target.value })
                }
              />
            </div>
            <div>
              <MiniLabel htmlFor="hours-close">{t('hoursTo')}</MiniLabel>
              <Input
                id="hours-close"
                type="time"
                value={hours.close}
                onChange={(e) =>
                  updateHours({ ...hours, close: e.target.value })
                }
              />
            </div>
          </div>
        </Section>

        <Section title={t('deliveryInfo')} hint={t('deliveryInfoHint')}>
          <div>
            <MiniLabel htmlFor="delivery-area">{t('deliveryArea')}</MiniLabel>
            <Input
              id="delivery-area"
              value={delivery.area}
              placeholder={t('deliveryAreaPlaceholder')}
              onChange={(e) =>
                updateDelivery({ ...delivery, area: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <MiniLabel htmlFor="delivery-from">{t('deliveryFrom')}</MiniLabel>
              <Input
                id="delivery-from"
                inputMode="numeric"
                value={delivery.fromHours}
                placeholder="24"
                onChange={(e) =>
                  updateDelivery({
                    ...delivery,
                    fromHours: e.target.value.replace(/[^\d]/g, ''),
                  })
                }
              />
            </div>
            <div>
              <MiniLabel htmlFor="delivery-to">{t('deliveryTo')}</MiniLabel>
              <Input
                id="delivery-to"
                inputMode="numeric"
                value={delivery.toHours}
                placeholder="48"
                onChange={(e) =>
                  updateDelivery({
                    ...delivery,
                    toHours: e.target.value.replace(/[^\d]/g, ''),
                  })
                }
              />
            </div>
            <div>
              <MiniLabel htmlFor="delivery-fee">{t('deliveryFee')}</MiniLabel>
              <Input
                id="delivery-fee"
                inputMode="numeric"
                value={delivery.fee}
                placeholder="50"
                onChange={(e) =>
                  updateDelivery({
                    ...delivery,
                    fee: e.target.value.replace(/[^\d]/g, ''),
                  })
                }
              />
            </div>
            <div>
              <MiniLabel htmlFor="delivery-free">
                {t('deliveryFreeAbove')}
              </MiniLabel>
              <Input
                id="delivery-free"
                inputMode="numeric"
                value={delivery.freeAbove}
                placeholder="1500"
                onChange={(e) =>
                  updateDelivery({
                    ...delivery,
                    freeAbove: e.target.value.replace(/[^\d]/g, ''),
                  })
                }
              />
            </div>
          </div>
        </Section>
      </div>

      <Section title={t('paymentInfo')} hint={t('paymentInfoHint')}>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((method) => {
            const selected = methods.includes(method);
            return (
              <button
                key={method}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleMethod(method)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-semibold transition',
                  selected
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-border text-muted hover:text-ink',
                )}
              >
                {t(PAYMENT_LABEL[method])}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title={t('faqs')} hint={t('faqsHint')}>
        <div className="space-y-3">
          {faqItems.map((item, index) => (
            <div
              key={item.id}
              className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
            >
              <div>
                <MiniLabel htmlFor={`faq-q-${item.id}`}>
                  {t('faqQuestion')} {index + 1}
                </MiniLabel>
                <Input
                  id={`faq-q-${item.id}`}
                  value={item.question}
                  placeholder={t('faqQuestionPlaceholder')}
                  onChange={(e) =>
                    updateFaq(item.id, { question: e.target.value })
                  }
                />
              </div>
              <div>
                <MiniLabel htmlFor={`faq-a-${item.id}`}>
                  {t('faqAnswer')}
                </MiniLabel>
                <Input
                  id={`faq-a-${item.id}`}
                  value={item.answer}
                  placeholder={t('faqAnswerPlaceholder')}
                  onChange={(e) =>
                    updateFaq(item.id, { answer: e.target.value })
                  }
                />
              </div>
              <button
                type="button"
                className="text-muted hover:text-danger border-border inline-flex h-12 w-12 items-center justify-center self-end rounded-xl border"
                aria-label={t('faqRemove')}
                onClick={() => {
                  const next =
                    faqItems.length === 1
                      ? [{ ...item, question: '', answer: '' }]
                      : faqItems.filter((faq) => faq.id !== item.id);
                  setFaqItems(next);
                  onFaqsChange(serializeFaqs(next));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setFaqItems((current) => [
                ...current,
                {
                  id: crypto.randomUUID(),
                  question: '',
                  answer: '',
                },
              ])
            }
          >
            <Plus className="h-4 w-4" />
            {t('faqAdd')}
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? t('saving') : t('save')}
          </Button>
        </div>
      </Section>
    </div>
  );
}
