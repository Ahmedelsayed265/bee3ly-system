import { OrderStatus } from '@prisma/client';
import { isImageAttachmentMessage } from '../channels/inbound-content';
import type { BusinessContext } from './types';

const PREPAID_RE =
  /instapay|insta\s*pay|vodafone|فودافون|bank|بنك|transfer|تحويل|wallet|محفظة|ipn|انستا\s?باي|انستاباي|انستا/i;
const COD_RE =
  /cod|cash\s*on\s*delivery|cash\s*at\s*delivery|كاش|الاستلام|upon\s*delivery|عند\s*الاستلام/i;

export function isPrepaidPaymentMethod(method: string): boolean {
  const m = method.trim();
  if (!m) return false;
  if (COD_RE.test(m)) return false;
  return PREPAID_RE.test(m);
}

export function assertCreateOrderAllowed(
  ctx: BusinessContext,
  paymentMethod: string,
  notes = '',
): void {
  if (!paymentMethod.trim()) {
    throw new Error(
      'paymentMethod is required — ask the customer to choose explicitly from Payment options in context; never assume cash on delivery',
    );
  }
  const paymentBlob = `${paymentMethod} ${notes}`.trim();
  if (ctx.paymentReviewPending) {
    throw new Error(
      'Payment review pending — wait for merchant to confirm transfer before createOrder',
    );
  }
  if (isImageAttachmentMessage(ctx.latestCustomerMessage)) {
    throw new Error(
      'Customer sent a transfer image — use transferToHuman PAYMENT_REVIEW only; do not createOrder',
    );
  }
  if (isPrepaidPaymentMethod(paymentBlob) && !ctx.paymentConfirmedForAi) {
    throw new Error(
      'Prepaid transfer: merchant must confirm payment in inbox before createOrder',
    );
  }
}

export const OPEN_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
];

export function assertAddOrderItemAllowed(ctx: BusinessContext): void {
  if (!ctx.openOrder) {
    throw new Error(
      'No open order for this chat — use createOrder for the first purchase',
    );
  }
  if (ctx.paymentReviewPending) {
    throw new Error(
      'Payment review pending — wait for merchant to confirm transfer before addOrderItem',
    );
  }
  if (isImageAttachmentMessage(ctx.latestCustomerMessage)) {
    throw new Error(
      'Customer sent a transfer image — use transferToHuman PAYMENT_REVIEW only; do not addOrderItem',
    );
  }
}
