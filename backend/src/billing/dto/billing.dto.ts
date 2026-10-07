import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
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

export class PaymobReturnDto {
  @IsString()
  @MinLength(1)
  @MaxLength(12000)
  search!: string;
}
