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

export const PAYMENT_METHODS = [
  'cod',
  'vodafone',
  'instapay',
  'card',
  'bank',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

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

export function parsePayment(raw: string): PaymentMethod[] {
  const data = readJson(raw);
  if (data?.kind === 'payment' && Array.isArray(data.methods)) {
    return data.methods.filter(isPaymentMethod);
  }
  if (!raw.trim()) return [];
  const found: PaymentMethod[] = [];
  if (/كاش|استلام|cash/i.test(raw)) found.push('cod');
  if (/فودافون|vodafone/i.test(raw)) found.push('vodafone');
  if (/انستا|إنستا|instapay/i.test(raw)) found.push('instapay');
  if (/فيزا|بطاقة|كارد|card|visa/i.test(raw)) found.push('card');
  if (/تحويل|بنك|bank/i.test(raw)) found.push('bank');
  return found;
}

export function serializePayment(methods: PaymentMethod[]) {
  if (!methods.length) return '';
  return JSON.stringify({ v: 1, kind: 'payment', methods });
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
