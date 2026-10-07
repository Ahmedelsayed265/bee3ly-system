import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service';
import { PaymobProvider } from './payment/paymob.provider';
import { TapProvider } from './payment/tap.provider';

@Injectable()
export class WebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly paymob: PaymobProvider,
    private readonly tap: TapProvider,
  ) {}

  async handlePaymob(payload: unknown, hmac?: string) {
    const outcome = await this.paymob.handleWebhook(payload, hmac);
    await this.apply(
      outcome.paymentId,
      outcome.status,
      outcome.providerReference,
    );
    return { received: true };
  }

  async handleTap(payload: unknown, hmac?: string) {
    const outcome = await this.tap.handleWebhook(payload, hmac);
    await this.apply(
      outcome.paymentId,
      outcome.status,
      outcome.providerReference,
    );
    return { received: true };
  }

  private async apply(
    paymentId: string | null,
    status: 'succeeded' | 'failed' | 'ignored',
    providerReference?: string,
  ) {
    if (!paymentId || status === 'ignored') return;
    if (providerReference) {
      await this.prisma.payment.updateMany({
        where: { id: paymentId, providerReference: null },
        data: { providerReference },
      });
    }
    if (status === 'succeeded') await this.billing.activatePayment(paymentId);
    if (status === 'failed') await this.billing.markPaymentFailed(paymentId);
  }
}
