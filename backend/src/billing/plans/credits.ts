import type { CreditKind } from '@prisma/client';

export type CreditPack = {
  id: string;
  kind: CreditKind;
  priceUsd: number;
  /** Null until Meta/AI unit cost is validated. Set CREDIT_PACK_<ID> to enable a pack. */
  credits: number | null;
};

const SHELF: CreditPack[] = [
  { id: 'whatsapp_5', kind: 'WHATSAPP', priceUsd: 5, credits: null },
  { id: 'whatsapp_10', kind: 'WHATSAPP', priceUsd: 10, credits: null },
  { id: 'whatsapp_25', kind: 'WHATSAPP', priceUsd: 25, credits: null },
  { id: 'whatsapp_50', kind: 'WHATSAPP', priceUsd: 50, credits: null },
  { id: 'ai_5', kind: 'AI', priceUsd: 5, credits: null },
  { id: 'ai_10', kind: 'AI', priceUsd: 10, credits: null },
  { id: 'ai_25', kind: 'AI', priceUsd: 25, credits: null },
  { id: 'ai_50', kind: 'AI', priceUsd: 50, credits: null },
];

export function listCreditPacks(): CreditPack[] {
  return SHELF.map((pack) => {
    const raw = process.env[`CREDIT_PACK_${pack.id.toUpperCase()}`];
    const parsed = raw ? Number(raw) : pack.credits;
    const credits =
      parsed != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    return { ...pack, credits };
  });
}

export function findCreditPack(id: string): CreditPack | null {
  return listCreditPacks().find((pack) => pack.id === id) ?? null;
}
