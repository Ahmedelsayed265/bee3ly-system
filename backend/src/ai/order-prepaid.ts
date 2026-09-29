export const PREPAID_VERIFIED_NOTE_RE = /PREPAID_VERIFIED_EGP:(\d+)/;

export function parsePrepaidVerifiedEgp(
  notes: string | null | undefined,
): number {
  if (!notes) return 0;
  const m = notes.match(PREPAID_VERIFIED_NOTE_RE);
  return m ? Number(m[1]) : 0;
}

export function upsertPrepaidVerifiedNote(
  notes: string | null | undefined,
  verifiedEgp: number,
): string {
  const tag = `PREPAID_VERIFIED_EGP:${verifiedEgp}`;
  const base = notes?.trim() ?? '';
  if (!base) return tag;
  if (PREPAID_VERIFIED_NOTE_RE.test(base)) {
    return base.replace(PREPAID_VERIFIED_NOTE_RE, tag);
  }
  return `${base} | ${tag}`;
}

export function computeOrderTotals(order: {
  totalEgp: number;
  shippingEgp: number | null;
  notes: string | null;
}) {
  const productsSubtotalEgp = order.totalEgp;
  const shippingEgp = order.shippingEgp ?? 0;
  const grandTotalEgp = productsSubtotalEgp + shippingEgp;
  const verifiedPrepaidEgp = parsePrepaidVerifiedEgp(order.notes);
  const balanceDueEgp = Math.max(0, grandTotalEgp - verifiedPrepaidEgp);
  return {
    productsSubtotalEgp,
    shippingEgp,
    grandTotalEgp,
    verifiedPrepaidEgp,
    balanceDueEgp,
  };
}
