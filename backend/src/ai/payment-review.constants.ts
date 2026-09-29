/** Handoff reason when a prepaid transfer screenshot needs merchant review. */
export const PAYMENT_REVIEW_HANDOFF = 'PAYMENT_REVIEW' as const;

export const PAYMENT_CONFIRMED_AI_SUMMARY =
  'PAYMENT_CONFIRMED: Merchant verified the transfer — complete the order with the customer.' as const;

import { MERCHANT_PAYMENT_CONFIRMED_INBOUND_TEXT } from '../channels/channel.types';

/** Synthetic inbound to Gemini after merchant clicks confirm (not shown as customer text). */
export const PAYMENT_CONFIRMED_BY_MERCHANT_TRIGGER =
  MERCHANT_PAYMENT_CONFIRMED_INBOUND_TEXT;

export type PaymentReviewHandoffReason = typeof PAYMENT_REVIEW_HANDOFF;
