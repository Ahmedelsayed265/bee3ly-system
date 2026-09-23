import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  asAttributes,
  formatAttributesLine,
  syncLegacyArrays,
} from '../../products/product-attributes';
import {
  asVariants,
  formatVariantsSummary,
  hasVariantMatrix,
} from '../../products/product-variants';
import { presentKnowledge } from '../../businesses/knowledge-text';
import type { BusinessContext } from '../types';

@Injectable()
export class ContextBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  async build(params: {
    businessId: string;
    conversationId: string;
    customerId: string;
    latestCustomerMessage: string;
  }): Promise<BusinessContext> {
    const [business, agent, products, conversation, customer] =
      await Promise.all([
        this.prisma.business.findUniqueOrThrow({
          where: { id: params.businessId },
        }),
        this.prisma.aIAgent.findUnique({
          where: { businessId: params.businessId },
        }),
        this.prisma.product.findMany({
          where: { businessId: params.businessId },
          orderBy: { createdAt: 'asc' },
          take: 20,
        }),
        this.prisma.conversation.findUniqueOrThrow({
          where: { id: params.conversationId },
          include: {
            campaign: true,
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 16,
            },
          },
        }),
        this.prisma.customer.findUniqueOrThrow({
          where: { id: params.customerId },
        }),
      ]);

    const historyAsc = [...conversation.messages].reverse();

    return {
      businessId: params.businessId,
      conversationId: params.conversationId,
      customerId: params.customerId,
      campaignId: conversation.campaignId,
      mode: conversation.mode,
      conversionStage: conversation.conversionStage,
      channel: conversation.channel,
      business: {
        name: business.name,
        type: business.type,
        description: business.description,
        operatingArea: business.operatingArea,
        workingHours: presentKnowledge(business.workingHours),
        deliveryInfo: presentKnowledge(business.deliveryInfo),
        paymentInfo: presentKnowledge(business.paymentInfo),
        faqs: presentKnowledge(business.faqs),
        primaryGoal: business.primaryGoal,
      },
      agent: {
        isActive: agent?.isActive ?? true,
        primaryGoal: agent?.primaryGoal ?? 'GET_ORDERS',
        tone: agent?.tone ?? 'FRIENDLY',
        instructions: agent?.instructions ?? null,
        handoffEnabled: agent?.handoffEnabled ?? true,
      },
      products: products.map((p) => {
        const attributes = asAttributes(p.attributes);
        const legacy = syncLegacyArrays(attributes);
        const variants = asVariants(p.variants);
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          priceEgp: p.priceEgp,
          attributes,
          sizes: legacy.sizes.length ? legacy.sizes : p.sizes,
          colors: legacy.colors.length ? legacy.colors : p.colors,
          stockQuantity: p.stockQuantity,
          inStock: p.inStock,
          variantsSummary: hasVariantMatrix(variants)
            ? formatVariantsSummary(variants)
            : undefined,
        };
      }),
      customer: {
        name: customer.name,
        phone: customer.phone,
      },
      campaign: conversation.campaign
        ? {
            id: conversation.campaign.id,
            name: conversation.campaign.name,
            objective: conversation.campaign.objective,
            offer: conversation.campaign.offer,
            audienceDescription: conversation.campaign.audienceDescription,
          }
        : null,
      history: historyAsc.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      latestCustomerMessage: params.latestCustomerMessage,
    };
  }

  toPromptBlock(ctx: BusinessContext): string {
    const productLines = ctx.products
      .map((p) => {
        const details =
          formatAttributesLine(p.attributes) ||
          [
            p.sizes.length ? `sizes:${p.sizes.join(',')}` : '',
            p.colors.length ? `colors:${p.colors.join(',')}` : '',
          ]
            .filter(Boolean)
            .join(' · ');
        return `- ${p.name} | ${p.priceEgp} EGP | ${
          p.stockQuantity != null
            ? `qty:${p.stockQuantity}`
            : `available:${p.inStock ? 'yes' : 'no'}`
        }${details ? ` | ${details}` : ''}${
          p.variantsSummary ? ` | ${p.variantsSummary}` : ''
        }`;
      })
      .join('\n');

    return [
      `Business: ${ctx.business.name} (${ctx.business.type})`,
      ctx.business.description ? `About: ${ctx.business.description}` : '',
      ctx.business.operatingArea ? `Area: ${ctx.business.operatingArea}` : '',
      ctx.business.workingHours ? `Hours: ${ctx.business.workingHours}` : '',
      ctx.business.deliveryInfo ? `Delivery: ${ctx.business.deliveryInfo}` : '',
      ctx.business.paymentInfo ? `Payment: ${ctx.business.paymentInfo}` : '',
      ctx.business.faqs ? `FAQs:\n${ctx.business.faqs}` : '',
      `Agent goal: ${ctx.agent.primaryGoal}`,
      `Tone: ${ctx.agent.tone}`,
      ctx.agent.instructions
        ? `Extra instructions: ${ctx.agent.instructions}`
        : '',
      `Customer known: name=${ctx.customer.name ?? '-'} phone=${ctx.customer.phone ?? '-'}`,
      `Stage: ${ctx.conversionStage}`,
      ctx.campaign
        ? `Campaign: ${ctx.campaign.name} / ${ctx.campaign.objective} / offer: ${ctx.campaign.offer}`
        : '',
      `Catalog:\n${productLines || '- none'}`,
    ]
      .filter(Boolean)
      .join('\n');
  }
}
