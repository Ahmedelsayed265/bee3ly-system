import {
  Clock,
  Landmark,
  MessageSquareText,
  Plus,
  Smartphone,
  Trash2,
  Truck,
  Wallet,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import {
  HOURS_PRESET_WEEKDAYS,
  PAYMENT_METHODS,
  PAYMENT_RECEIVER_METHODS,
  WEEK_DAYS,
  describeHours,
  describePayment,
  hoursCrossesMidnight,
  paymentCustomerExample,
  prepaidReceiversMissing,
  parseFaqs,
  parseHours,
  parsePayment,
  serializeFaqs,
  serializeHours,
  serializePayment,
  type FaqDraft,
  type HoursDraft,
  type PaymentDraft,
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
  const payment = parsePayment(paymentInfo);
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

  const updatePayment = (next: PaymentDraft) => {
    onPaymentInfoChange(serializePayment(next));
  };

  const toggleMethod = (method: PaymentMethod) => {
    const methods = payment.methods.includes(method)
      ? payment.methods.filter((item) => item !== method)
      : PAYMENT_METHODS.filter(
          (item) => item === method || payment.methods.includes(item),
        );
    const receivers = { ...payment.receivers };
    if (!methods.includes(method)) delete receivers[method];
    updatePayment({ methods, receivers });
  };

  const setReceiver = (method: PaymentMethod, value: string) => {
    updatePayment({
      ...payment,
      receivers: { ...payment.receivers, [method]: value },
    });
  };

  const updateFaq = (id: string, patch: Partial<FaqDraft>) => {
    const next = faqItems.map((item) =>
      item.id === id ? { ...item, ...patch } : item,
    );
    setFaqItems(next);
    onFaqsChange(serializeFaqs(next));
  };

  const hoursPreview = describeHours(hours, locale);
  const paymentPreview = describePayment(payment, locale);
  const paymentExample = paymentCustomerExample(payment, locale);
  const missingReceivers = prepaidReceiversMissing(payment);
  const prepaidActive = PAYMENT_RECEIVER_METHODS.some((m) =>
    payment.methods.includes(m),
  );
  const crossMidnight = hoursCrossesMidnight(hours);

  const codOn = payment.methods.includes('cod');
  const previewText = [paymentPreview, paymentExample]
    .filter(Boolean)
    .join('\n\n');

  const paymentSection = (
    <Section title={t('paymentInfo')} hint={t('paymentInfoHint')}>
      <div className="border-border flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="bg-brand/10 text-brand flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Truck className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-ink text-sm font-semibold">{t('payCod')}</p>
            <p className="text-muted text-xs">{t('paymentMethodCodHint')}</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={codOn}
          onClick={() => toggleMethod('cod')}
          className={cn(
            'relative h-7 w-12 shrink-0 rounded-full transition',
            codOn ? 'bg-brand' : 'bg-border',
          )}
        >
          <span
            className={cn(
              'bg-surface absolute top-0.5 left-0.5 size-6 rounded-full transition',
              codOn && 'translate-x-5',
            )}
          />
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-ink text-xs font-semibold">
          {t('paymentPrepaidSection')}
        </p>
        <div className="border-border divide-border w-full divide-y rounded-xl border">
          {PAYMENT_RECEIVER_METHODS.map((method) => {
            const selected = payment.methods.includes(method);
            const Icon =
              method === 'vodafone'
                ? Smartphone
                : method === 'instapay'
                  ? Wallet
                  : Landmark;
            return (
              <div
                key={method}
                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3"
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleMethod(method)}
                  className={cn(
                    'inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition sm:w-36',
                    selected
                      ? 'border-brand bg-brand text-white'
                      : 'border-border text-muted hover:border-brand/50',
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {t(PAYMENT_LABEL[method])}
                </button>
                <Input
                  id={`payment-recv-${method}`}
                  disabled={!selected}
                  value={payment.receivers[method] ?? ''}
                  onChange={(e) => setReceiver(method, e.target.value)}
                  placeholder={t(
                    `paymentReceiver_${method}` as
                      | 'paymentReceiver_vodafone'
                      | 'paymentReceiver_instapay'
                      | 'paymentReceiver_bank',
                  )}
                  className="h-10 min-w-0 flex-1"
                  aria-label={t(PAYMENT_LABEL[method])}
                />
              </div>
            );
          })}
        </div>
        {prepaidActive && missingReceivers.length ? (
          <p className="text-xs leading-5 text-amber-700 dark:text-amber-400">
            {t('paymentReceiverMissing')}
          </p>
        ) : null}
      </div>

      {!payment.methods.length ? (
        <p className="text-danger text-xs leading-5">
          {t('paymentNoneWarning')}
        </p>
      ) : null}

      {previewText ? (
        <div>
          <p className="text-muted mb-1.5 text-xs font-semibold">
            {t('knowledgePreviewTitle')}
          </p>
          <PreviewLine text={previewText} />
        </div>
      ) : null}
    </Section>
  );

  const hoursSection = (
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
            onChange={(e) => updateHours({ ...hours, open: e.target.value })}
          />
        </div>
        <div>
          <MiniLabel htmlFor="hours-close">{t('hoursTo')}</MiniLabel>
          <Input
            id="hours-close"
            type="time"
            value={hours.close}
            onChange={(e) => updateHours({ ...hours, close: e.target.value })}
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
  );

  return (
    <div className="space-y-4">
      <div className="border-border bg-surface flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
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
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="w-full shrink-0 sm:w-auto sm:min-w-28"
        >
          {isSaving ? t('saving') : t('save')}
        </Button>
      </div>

      {!showWorkingHours ? (
        <div className="border-border bg-lavender/25 flex gap-3 rounded-2xl border p-4">
          <Clock className="text-muted mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-muted text-xs leading-5">
            {t('workingHoursUnavailable')}
          </p>
        </div>
      ) : null}

      {showWorkingHours ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {hoursSection}
          {paymentSection}
        </div>
      ) : (
        paymentSection
      )}

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
    </div>
  );
}
