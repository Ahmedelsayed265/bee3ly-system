export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'RETURNED',
] as const;

export type OrderStatusFilter = (typeof ORDER_STATUSES)[number];

export type OrderCounts = Record<OrderStatusFilter, number>;

export const EMPTY_ORDER_COUNTS: OrderCounts = {
  PENDING: 0,
  CONFIRMED: 0,
  COMPLETED: 0,
  CANCELLED: 0,
  RETURNED: 0,
};

export type OrderStatusAction =
  'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'RETURNED';
