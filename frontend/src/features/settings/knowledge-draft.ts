import type { Locale } from '@/features/i18n/messages';

export const WEEK_DAYS = [
  'sat',
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];

export const PAYMENT_METHODS = ['cod', 'vodafone', 'instapay', 'bank'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Wallet / account the customer pays to (vodafone, instapay, bank, …). */
export type PaymentReceivers = Partial<Record<PaymentMethod, string>>;

export type PaymentDraft = {
  methods: PaymentMethod[];
  receivers: PaymentReceivers;
};

export type HoursDraft = {
  days: WeekDay[];
  open: string;
  close: string;
};

export type DeliveryDraft = {
  area: string;
  fromHours: string;
  toHours: string;
  fee: string;
  freeAbove: string;
};

export type FaqDraft = {
  id: string;
  question: string;
  answer: string;
};

const DAY_WORDS: Record<WeekDay, string[]> = {
  sat: ['السبت'],
  sun: ['الأحد', 'الاحد'],
  mon: ['الإثنين', 'الاثنين', 'الاتنين'],
  tue: ['الثلاثاء', 'التلات'],
  wed: ['الأربعاء', 'الاربعاء', 'الأربع'],
  thu: ['الخميس'],
  fri: ['الجمعة', 'الجمعه'],
};

function newId() {
  return crypto.randomUUID();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readJson(raw: string) {
  const text = raw.trim();
  if (!text.startsWith('{')) return null;
  try {
    const data: unknown = JSON.parse(text);
    if (!isRecord(data) || data.v !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

function asString(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function isWeekDay(value: unknown): value is WeekDay {
  return WEEK_DAYS.some((day) => day === value);
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return PAYMENT_METHODS.some((method) => method === value);
}

function to24h(hour: number, suffix: string) {
  const isPm = suffix === 'م';
  let next = hour % 12;
  if (isPm) next += 12;
  return `${String(next).padStart(2, '0')}:00`;
}

function parseArabicClock(text: string) {
  const matches = [...text.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(ص|م)/g)];
  if (matches.length < 2) return { open: '', close: '' };
  const [open, close] = matches.slice(0, 2).map((match) => {
    const hour = Number(match[1]);
    const minutes = match[2];
    if (minutes) {
      const isPm = match[3] === 'م';
      let next = hour % 12;
      if (isPm) next += 12;
      return `${String(next).padStart(2, '0')}:${minutes}`;
    }
    return to24h(hour, match[3] ?? 'ص');
  });
  return { open: open ?? '', close: close ?? '' };
}

function parseLegacyDays(text: string): WeekDay[] {
  const found = WEEK_DAYS.filter((day) =>
    DAY_WORDS[day].some((word) => text.includes(word)),
  );
  if (
    found.includes('sat') &&
    found.includes('thu') &&
    !found.includes('fri') &&
    found.length <= 2
  ) {
    return ['sat', 'sun', 'mon', 'tue', 'wed', 'thu'];
  }
  return found;
}

export function emptyHours(): HoursDraft {
  return { days: [], open: '', close: '' };
}

export function parseHours(raw: string): HoursDraft {
  const data = readJson(raw);
  if (data?.kind === 'hours' && Array.isArray(data.days)) {
    return {
      days: data.days.filter(isWeekDay),
      open: asString(data.open),
      close: asString(data.close),
    };
  }
  if (!raw.trim()) return emptyHours();
  const clock = parseArabicClock(raw);
  return { days: parseLegacyDays(raw), ...clock };
}

export function serializeHours(draft: HoursDraft) {
  if (!draft.days.length && !draft.open && !draft.close) return '';
  return JSON.stringify({
    v: 1,
    kind: 'hours',
    days: draft.days,
    open: draft.open,
    close: draft.close,
  });
}

export function emptyDelivery(): DeliveryDraft {
  return { area: '', fromHours: '', toHours: '', fee: '', freeAbove: '' };
}

export function parseDelivery(raw: string): DeliveryDraft {
  const data = readJson(raw);
  if (data?.kind === 'delivery') {
    return {
      area: asString(data.area),
      fromHours: asString(data.fromHours),
      toHours: asString(data.toHours),
      fee: asString(data.fee),
      freeAbove: asString(data.freeAbove),
    };
  }
  if (!raw.trim()) return emptyDelivery();
  const window = raw.match(/(\d+)\s*[-–]\s*(\d+)\s*ساعة/);
  const freeAbove = raw.match(/مجاني فوق\s*(\d+)/);
  const fee = raw.match(/(\d+)\s*ج/);
  const area = raw.match(/داخل\s+([^·،.\n]+)/);
  return {
    area: area?.[1]?.trim() ?? '',
    fromHours: window?.[1] ?? '',
    toHours: window?.[2] ?? '',
    fee: fee && fee[1] !== freeAbove?.[1] ? fee[1] : '',
    freeAbove: freeAbove?.[1] ?? '',
  };
}

export function serializeDelivery(draft: DeliveryDraft) {
  if (
    !draft.area &&
    !draft.fromHours &&
    !draft.toHours &&
    !draft.fee &&
    !draft.freeAbove
  ) {
    return '';
  }
  return JSON.stringify({
    v: 1,
    kind: 'delivery',
    area: draft.area.trim(),
    fromHours: draft.fromHours,
    toHours: draft.toHours,
    fee: draft.fee,
    freeAbove: draft.freeAbove,
  });
}

function parseReceivers(data: Record<string, unknown>): PaymentReceivers {
  if (!isRecord(data.receivers)) return {};
  const out: PaymentReceivers = {};
  for (const method of PAYMENT_METHODS) {
    const value = asString(data.receivers[method]);
    if (value) out[method] = value;
  }
  return out;
}

export function parsePayment(raw: string): PaymentDraft {
  const data = readJson(raw);
  if (data?.kind === 'payment' && Array.isArray(data.methods)) {
    return {
      methods: data.methods.filter(isPaymentMethod),
      receivers: parseReceivers(data),
    };
  }
  if (!raw.trim()) return { methods: [], receivers: {} };
  const found: PaymentMethod[] = [];
  if (/كاش|استلام|cash/i.test(raw)) found.push('cod');
  if (/فودافون|vodafone/i.test(raw)) found.push('vodafone');
  if (/انستا|إنستا|instapay/i.test(raw)) found.push('instapay');
  if (/تحويل|بنك|bank/i.test(raw)) found.push('bank');
  return { methods: found, receivers: {} };
}

export function serializePayment(draft: PaymentDraft) {
  if (!draft.methods.length) return '';
  return JSON.stringify({
    v: 1,
    kind: 'payment',
    methods: draft.methods,
    receivers: draft.receivers,
  });
}

export function emptyFaq(): FaqDraft {
  return { id: newId(), question: '', answer: '' };
}

export function parseFaqs(raw: string): FaqDraft[] {
  const data = readJson(raw);
  if (data?.kind === 'faqs' && Array.isArray(data.items)) {
    const items = data.items.flatMap((item) => {
      if (!isRecord(item)) return [];
      return [
        {
          id: newId(),
          question: asString(item.q),
          answer: asString(item.a),
        },
      ];
    });
    return items.length ? items : [emptyFaq()];
  }
  const lines = raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [emptyFaq()];
  return lines.map((line) => {
    const splitAt = line.indexOf('؟');
    if (splitAt === -1) {
      return { id: newId(), question: line, answer: '' };
    }
    return {
      id: newId(),
      question: line.slice(0, splitAt + 1).trim(),
      answer: line
        .slice(splitAt + 1)
        .replace(/^[\s.:،-]+/, '')
        .trim(),
    };
  });
}

export function serializeFaqs(items: FaqDraft[]) {
  const filled = items
    .map((item) => ({
      q: item.question.trim(),
      a: item.answer.trim(),
    }))
    .filter((item) => item.q || item.a);
  if (!filled.length) return '';
  return JSON.stringify({ v: 1, kind: 'faqs', items: filled });
}

const DAY_LABEL_AR: Record<WeekDay, string> = {
  sat: 'السبت',
  sun: 'الأحد',
  mon: 'الإثنين',
  tue: 'الثلاثاء',
  wed: 'الأربعاء',
  thu: 'الخميس',
  fri: 'الجمعة',
};

const DAY_LABEL_EN: Record<WeekDay, string> = {
  sat: 'Sat',
  sun: 'Sun',
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
};

const PAYMENT_LABEL_AR: Record<PaymentMethod, string> = {
  cod: 'كاش عند الاستلام',
  vodafone: 'فودافون كاش',
  instapay: 'إنستاباي',
  bank: 'تحويل بنكي',
};

const PAYMENT_LABEL_EN: Record<PaymentMethod, string> = {
  cod: 'Cash on delivery',
  vodafone: 'Vodafone Cash',
  instapay: 'InstaPay',
  bank: 'Bank transfer',
};

export const HOURS_PRESET_WEEKDAYS: WeekDay[] = [
  'sat',
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
];

function formatClock(value: string, locale: Locale) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const hour = Number(match[1]);
  const minutes = match[2];
  if (locale === 'en') {
    const suffix = hour < 12 ? 'AM' : 'PM';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return minutes === '00'
      ? `${hour12} ${suffix}`
      : `${hour12}:${minutes} ${suffix}`;
  }
  const suffix = hour < 12 ? 'ص' : 'م';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return minutes === '00'
    ? `${hour12} ${suffix}`
    : `${hour12}:${minutes} ${suffix}`;
}

function formatDayRange(days: WeekDay[], locale: Locale) {
  const indexes = days
    .map((day) => WEEK_DAYS.indexOf(day))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);
  if (!indexes.length) return '';
  const labels = locale === 'ar' ? DAY_LABEL_AR : DAY_LABEL_EN;
  if (indexes.length === WEEK_DAYS.length) {
    return locale === 'ar' ? 'كل أيام الأسبوع' : 'Every day';
  }
  const contiguous = indexes.every(
    (index, position) => position === 0 || index === indexes[position - 1]! + 1,
  );
  const dayLabels = indexes.map((index) => labels[WEEK_DAYS[index]!]);
  if (contiguous && dayLabels.length > 1) {
    return `${dayLabels[0]}–${dayLabels[dayLabels.length - 1]}`;
  }
  const sep = locale === 'ar' ? '، ' : ', ';
  return dayLabels.join(sep);
}

/** Human-readable hours line (matches backend `presentKnowledge` for hours). */
export function describeHours(draft: HoursDraft, locale: Locale) {
  const days = formatDayRange(draft.days, locale);
  const open = formatClock(draft.open, locale);
  const close = formatClock(draft.close, locale);
  const clock = open && close ? `${open} – ${close}` : open || close;
  const sep = locale === 'ar' ? '، ' : ', ';
  return [days, clock].filter(Boolean).join(sep);
}

export function describePayment(draft: PaymentDraft, locale: Locale) {
  const labels = locale === 'ar' ? PAYMENT_LABEL_AR : PAYMENT_LABEL_EN;
  const sep = locale === 'ar' ? ' · ' : ' · ';
  return draft.methods
    .map((method) => {
      const recv = draft.receivers[method]?.trim();
      return recv ? `${labels[method]}: ${recv}` : labels[method];
    })
    .join(sep);
}

export const PAYMENT_RECEIVER_METHODS: PaymentMethod[] = [
  'vodafone',
  'instapay',
  'bank',
];

/** Example reply the sales agent may send after quoteCheckout (preview only). */
export function paymentCustomerExample(draft: PaymentDraft, locale: Locale) {
  const labels = locale === 'ar' ? PAYMENT_LABEL_AR : PAYMENT_LABEL_EN;
  const prepaid = PAYMENT_RECEIVER_METHODS.find(
    (m) =>
      draft.methods.includes(m) &&
      (draft.receivers[m]?.trim()?.length ?? 0) > 0,
  );
  if (!prepaid) return '';
  const recv = draft.receivers[prepaid]!.trim();
  const label = labels[prepaid];
  if (locale === 'ar') {
    return `تمام يا فندم، حوّل {المبلغ} ج.م على ${label} (${recv})، وبعدها ابعت صورة التحويل ونراجع ونأكد الأوردر.`;
  }
  return `Transfer {amount} EGP to ${label} (${recv}), then send a payment screenshot so we can confirm your order.`;
}

export function prepaidReceiversMissing(draft: PaymentDraft) {
  return PAYMENT_RECEIVER_METHODS.filter(
    (m) =>
      draft.methods.includes(m) && !(draft.receivers[m]?.trim()?.length ?? 0),
  );
}

export function hoursCrossesMidnight(draft: HoursDraft) {
  if (!draft.open || !draft.close) return false;
  return draft.close <= draft.open;
}
