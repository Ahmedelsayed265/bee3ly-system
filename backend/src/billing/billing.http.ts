import { HttpException, HttpStatus } from '@nestjs/common';

export class BillingLimitException extends HttpException {
  constructor(
    code:
      | 'TRIAL_ENDED'
      | 'SUBSCRIPTION_INACTIVE'
      | 'USAGE_LIMIT'
      | 'PLAN_FEATURE',
    message: string,
    extra?: Record<string, unknown>,
  ) {
    super({ code, message, ...extra }, HttpStatus.PAYMENT_REQUIRED);
  }
}

export function isBillingLimit(error: unknown): boolean {
  return (
    error instanceof HttpException &&
    error.getStatus() === HttpStatus.PAYMENT_REQUIRED
  );
}
