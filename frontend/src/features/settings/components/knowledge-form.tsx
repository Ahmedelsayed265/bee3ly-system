import { MessageSquareText, Plus, Trash2, Truck } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import {
  HOURS_PRESET_WEEKDAYS,
  PAYMENT_METHODS,
  WEEK_DAYS,
  describeHours,
  describePayment,
  hoursCrossesMidnight,
  parseFaqs,
  parseHours,
  parsePayment,
  serializeFaqs,
  serializeHours,
  serializePayment,
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
  workingHours: string;
  paymentInfo: string;
  showWorkingHours: boolean;
  isSaving: boolean;
  onFaqsChange: (value: string) => void;
  onWorkingHoursChange: (value: string) => void;
  onPaymentInfoChange: (value: string) => void;
  onSave: () => void;
  onOpenDelivery?: () => void;
};

function Section({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'border-border bg-surface space-y-4 rounded-2xl border p-5',
        className,
      )}
    >
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

function PreviewLine({ text }: { text: string }) {
  const { t } = useLocale();
  return (
    <div className="bg-lavender/40 border-border flex gap-2 rounded-xl border px-3 py-2.5">
      <MessageSquareText className="text-brand mt-0.5 h-4 w-4 shrink-0" />
      <p className="text-ink text-xs leading-5">
        {text || t('knowledgePreviewEmpty')}
      </p>
    </div>
  );
}

export function KnowledgeForm({
  faqs,
  workingHours,
  paymentInfo,
  showWorkingHours,
  isSaving,
  onFaqsChange,
  onWorkingHoursChange,
  onPaymentInfoChange,
  onSave,
  onOpenDelivery,
}: KnowledgeFormProps) {
  const { locale, t } = useLocale();
  const hours = parseHours(workingHours);
  const methods = parsePayment(paymentInfo);
  const [faqItems, setFaqItems] = useState<FaqDraft[]>(() => parseFaqs(faqs));

  const updateHours = (next: HoursDraft) => {
    onWorkingHoursChange(serializeHours(next));
  };

  const toggleDay = (day: WeekDay) => {
    const days = hours.days.includes(day)
      ? hours.days.filter((item) => item !== day)
      : WEEK_DAYS.filter((item) => item === day || hours.days.includes(item));
    updateHours({ ...hours, days });
  };

  const applyDayPreset = (days: WeekDay[]) => {
    updateHours({ ...hours, days: [...days] });
  };

  const toggleMethod = (method: PaymentMethod) => {
    const next = methods.includes(method)
      ? methods.filter((item) => item !== method)
      : PAYMENT_METHODS.filter(
          (item) => item === method || methods.includes(item),
        );
    onPaymentInfoChange(serializePayment(next));
  };

  const updateFaq = (id: string, patch: Partial<FaqDraft>) => {
    const next = faqItems.map((item) =>
      item.id === id ? { ...item, ...patch } : item,
    );
    setFaqItems(next);
    onFaqsChange(serializeFaqs(next));
  };

  const hoursPreview = describeHours(hours, locale);
  const paymentPreview = describePayment(methods, locale);
  const crossMidnight = hoursCrossesMidnight(hours);

  return (
    <div className="space-y-4 pb-20">
      <div className="border-border bg-surface rounded-2xl border p-5">
        <h2 className="text-ink text-sm font-semibold">
          {t('knowledgeOpsTitle')}
        </h2>
        <p className="text-muted mt-1 text-xs leading-5">
          {t(
            showWorkingHours
              ? 'knowledgeOpsHintPhysical'
              : 'knowledgeOpsHintOnline',
          )}
        </p>
      </div>

      <div
        className={cn(
          'grid gap-4',
          showWorkingHours ? 'xl:grid-cols-2' : 'max-w-xl',
        )}
      >
        {showWorkingHours ? (
          <Section title={t('workingHours')} hint={t('workingHoursHint')}>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-full text-xs"
                onClick={() => applyDayPreset(HOURS_PRESET_WEEKDAYS)}
              >
                {t('hoursPresetWeekdays')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-full text-xs"
                onClick={() => applyDayPreset([...WEEK_DAYS])}
              >
                {t('hoursPresetAllDays')}
              </Button>
            </div>
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
            <div className="grid max-w-md grid-cols-2 gap-3">
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
            {crossMidnight ? (
              <p className="text-muted text-xs leading-5">
                {t('hoursCrossMidnightHint')}
              </p>
            ) : null}
            <div>
              <p className="text-muted mb-1.5 text-xs font-semibold">
                {t('knowledgePreviewTitle')}
              </p>
              <PreviewLine text={hoursPreview} />
            </div>
          </Section>
        ) : (
          <p className="text-muted text-xs leading-5 xl:col-span-2">
            {t('workingHoursUnavailable')}
          </p>
        )}

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
          {!methods.length ? (
            <p className="text-danger text-xs leading-5">
              {t('paymentNoneWarning')}
            </p>
          ) : null}
          <div>
            <p className="text-muted mb-1.5 text-xs font-semibold">
              {t('knowledgePreviewTitle')}
            </p>
            <PreviewLine text={paymentPreview} />
          </div>
        </Section>
      </div>

      <div className="border-border bg-surface flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <Truck className="text-brand mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-ink text-sm font-semibold">
              {t('knowledgeShippingTitle')}
            </p>
            <p className="text-muted mt-0.5 text-xs leading-5">
              {t('knowledgeShippingNote')}
            </p>
          </div>
        </div>
        {onOpenDelivery ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={onOpenDelivery}
          >
            {t('goToDeliverySettings')}
          </Button>
        ) : null}
      </div>

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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const next = [
              ...faqItems,
              {
                id: crypto.randomUUID(),
                question: '',
                answer: '',
              },
            ];
            setFaqItems(next);
            onFaqsChange(serializeFaqs(next));
          }}
        >
          <Plus className="h-4 w-4" />
          {t('faqAdd')}
        </Button>
      </Section>

      <div className="border-border bg-surface/95 supports-[backdrop-filter]:bg-surface/80 sticky bottom-0 z-10 -mx-1 flex items-center justify-end gap-3 rounded-xl border px-4 py-3 shadow-sm backdrop-blur">
        <Button onClick={onSave} disabled={isSaving} className="min-w-28">
          {isSaving ? t('saving') : t('save')}
        </Button>
      </div>
    </div>
  );
}
