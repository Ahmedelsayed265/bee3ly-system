/** `totalEgp` in API = sum of line items (excludes shipping). */
export function orderGrandTotalEgp(order: {
  totalEgp: number;
  shippingEgp?: number | null;
}): number {
  return order.totalEgp + (order.shippingEgp ?? 0);
}
