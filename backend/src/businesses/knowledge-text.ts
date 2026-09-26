const WEEK_DAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;

const DAY_LABEL: Record<(typeof WEEK_DAYS)[number], string> = {
  sat: 'السبت',
  sun: 'الأحد',
  mon: 'الإثنين',
  tue: 'الثلاثاء',
  wed: 'الأربعاء',
  thu: 'الخميس',
  fri: 'الجمعة',
};

const PAYMENT_LABEL: Record<string, string> = {
  cod: 'كاش عند الاستلام',
  vodafone: 'فودافون كاش',
  instapay: 'إنستاباي',
  card: 'بطاقة',
  bank: 'تحويل بنكي',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function formatClock(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const hour = Number(match[1]);
  const minutes = match[2];
  const suffix = hour < 12 ? 'ص' : 'م';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return minutes === '00'
    ? `${hour12} ${suffix}`
    : `${hour12}:${minutes} ${suffix}`;
}

function formatDays(days: string[]) {
  const indexes = days
    .map((day) => WEEK_DAYS.indexOf(day as (typeof WEEK_DAYS)[number]))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);
  if (!indexes.length) return '';
  if (indexes.length === WEEK_DAYS.length) return 'كل أيام الأسبوع';
  const contiguous = indexes.every(
    (index, position) => position === 0 || index === indexes[position - 1]! + 1,
  );
  const labels = indexes.map((index) => DAY_LABEL[WEEK_DAYS[index]!]);
  if (contiguous && labels.length > 1) {
    return `${labels[0]}–${labels[labels.length - 1]}`;
  }
  return labels.join('، ');
}

function formatKnowledge(data: Record<string, unknown>) {
  if (data.kind === 'hours') {
    const days = Array.isArray(data.days)
      ? formatDays(data.days.filter((day) => typeof day === 'string'))
      : '';
    const open = formatClock(asString(data.open));
    const close = formatClock(asString(data.close));
    const clock = open && close ? `${open} – ${close}` : open || close;
    return [days, clock].filter(Boolean).join('، ');
  }

  if (data.kind === 'delivery') {
    const fromHours = asString(data.fromHours);
    const toHours = asString(data.toHours);
    const fee = asString(data.fee);
    const area = asString(data.area);
    const freeAbove = asString(data.freeAbove);
    return [
      fromHours && toHours ? `خلال ${fromHours}–${toHours} ساعة` : '',
      fee ? `${fee} ج.م` : '',
      area ? `داخل ${area.replace(/^داخل\s+/, '')}` : '',
      freeAbove ? `مجاني فوق ${freeAbove} ج.م` : '',
    ]
      .filter(Boolean)
      .join(' · ');
  }

  if (data.kind === 'payment' && Array.isArray(data.methods)) {
    return data.methods
      .map((method) =>
        typeof method === 'string' ? PAYMENT_LABEL[method] : '',
      )
      .filter(Boolean)
      .join('، ');
  }

  if (data.kind === 'faqs' && Array.isArray(data.items)) {
    return data.items
      .map((item) => {
        if (!isRecord(item)) return '';
        const question = asString(item.q);
        const answer = asString(item.a);
        if (!question && !answer) return '';
        return answer ? `${question} ${answer}` : question;
      })
      .filter(Boolean)
      .join('\n');
  }

  return '';
}

/** Turn structured settings JSON into the sentence the AI should read. Plain text is kept as-is. */
export function presentKnowledge(raw: string | null | undefined) {
  const text = raw?.trim();
  if (!text) return null;
  if (!text.startsWith('{')) return text;
  try {
    const data: unknown = JSON.parse(text);
    if (!isRecord(data) || data.v !== 1) return text;
    return formatKnowledge(data) || text;
  } catch {
    return text;
  }
}
