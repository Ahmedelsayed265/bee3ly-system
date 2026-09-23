import type { MeasuredMetric } from '@/features/business/api';

export function formatMetricValue(
  value: number,
  unit: MeasuredMetric['unit'],
  locale: string,
) {
  const loc = locale === 'ar' ? 'ar-EG' : 'en-US';
  if (unit === 'count') return value.toLocaleString(loc);
  if (unit === 'percent') {
    return `${value.toLocaleString(loc, { maximumFractionDigits: 1 })}%`;
  }
  if (unit === 'multiple') {
    return `${value.toLocaleString(loc, { maximumFractionDigits: 2 })}x`;
  }
  return value.toLocaleString(loc, { maximumFractionDigits: 1 });
}
