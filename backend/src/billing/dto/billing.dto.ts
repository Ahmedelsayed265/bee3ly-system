import { IsIn, IsString, MinLength } from 'class-validator';
import type { BillingIntervalCode, PublicPlan } from '../plans/plans';

export class CheckoutDto {
  @IsIn(['STARTER', 'GROWTH', 'PRO'])
  plan!: PublicPlan;

  @IsIn(['MONTHLY', 'ANNUAL'])
  interval!: BillingIntervalCode;
}

export class CreditCheckoutDto {
  @IsString()
  @MinLength(1)
  packId!: string;
}

export class ConfirmPaymentDto {
  @IsString()
  @MinLength(1)
  paymentId!: string;
}
