import type { BillingIntervalCode } from './plans';

export function addBillingInterval(start: Date, interval: BillingIntervalCode) {
  const end = new Date(start.getTime());
  if (interval === 'ANNUAL') end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return end;
}

export function addDays(start: Date, days: number) {
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
}

export function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

export function startOfUtcMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function startOfUtcDay(date = new Date()) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
