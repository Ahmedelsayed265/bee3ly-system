import { Injectable } from '@nestjs/common';
import { CreditKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async grant(input: {
    businessId: string;
    kind: CreditKind;
    quantity: number;
    source: string;
    externalReference?: string;
  }) {
    const field = input.kind === 'WHATSAPP' ? 'whatsappCredits' : 'aiCredits';
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.creditWallet.upsert({
        where: { businessId: input.businessId },
        create: {
          businessId: input.businessId,
          [field]: input.quantity,
        },
        update: { [field]: { increment: input.quantity } },
      });
      await tx.creditTransaction.create({
        data: {
          businessId: input.businessId,
          kind: input.kind,
          delta: input.quantity,
          balanceAfter: wallet[field],
          source: input.source,
          externalReference: input.externalReference,
        },
      });
      await tx.billingEvent.create({
        data: {
          businessId: input.businessId,
          type: 'CREDIT_PURCHASED',
          payload: {
            kind: input.kind,
            quantity: input.quantity,
            paymentId: input.externalReference ?? null,
          },
        },
      });
      return wallet;
    });
  }
}
