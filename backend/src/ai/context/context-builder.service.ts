import { Injectable } from '@nestjs/common';
import {
  PAYMENT_CONFIRMED_AI_SUMMARY,
  PAYMENT_REVIEW_HANDOFF,
} from '../payment-review.constants';
import { PrismaService } from '../../prisma/prisma.service';
import {
  asAttributes,
  formatAttributesLine,
  productSizeColorLists,
} from '../../products/product-attributes';
import {
  asVariants,
  formatVariantsDetailForPrompt,
  hasVariantMatrix,
} from '../../products/product-variants';
import { presentKnowledge } from '../../businesses/knowledge-text';
import { businessUsesPhysicalHours } from '../../businesses/uses-physical-hours';
import {
  formatShippingZonesForKnowledge,
  parseShippingZones,
} from '../../businesses/shipping-zones';
import { OPEN_ORDER_STATUSES } from '../payment-order.guards';
import type { BusinessContext } from '../types';
import { AiContextCacheService } from './ai-context-cache.service';

@Injectable()
export class ContextBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogCache: AiContextCacheService,
  ) {}

  /** Cached catalog + business settings (TTL). Stock tools still read DB live. */
  async loadCatalogSnapshot(businessId: string) {
    const cached = this.catalogCache.get(businessId);
    if (cached) return cached;

    const [business, agent, products] = await Promise.all([
      this.prisma.business.findUniqueOrThrow({
        where: { id: businessId },
      }),
      this.prisma.aIAgent.findUnique({
        where: { businessId },
      }),
      this.prisma.product.findMany({
        where: { businessId },
        orderBy: { createdAt: 'asc' },
        take: 20,
      }),
    ]);

    const mappedProducts = products.map((p) => {
      const attributes = asAttributes(p.attributes);
      const variants = asVariants(p.variants);
      const lists = productSizeColorLists(p);
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        priceEgp: p.priceEgp,
        attributes,
        sizes: lists.sizes,
        colors: lists.colors,
        stockQuantity: p.stockQuantity,
        inStock: p.inStock,
        variantsSummary: hasVariantMatrix(variants)
          ? formatVariantsDetailForPrompt(variants)
          : undefined,
      };
    });

    const snapshot = {
      business: {
        name: business.name,
        type: business.type,
        description: business.description,
        operatingArea: business.operatingArea,
        workingHours: businessUsesPhysicalHours(business.type)
          ? presentKnowledge(business.workingHours)
          : null,
        deliveryInfo: presentKnowledge(business.deliveryInfo),
        shippingRates:
          formatShippingZonesForKnowledge(
            parseShippingZones(business.shippingZones),
          ) || null,
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
      products: mappedProducts,
      catalogPromptBlock: this.renderCatalogBlock(mappedProducts),
    };

    this.catalogCache.set(businessId, snapshot);
    return snapshot;
  }

  async build(
    params: {
      businessId: string;
      conversationId: string;
      customerId: string;
      latestCustomerMessage: string;
    },
    options: { includeMessageHistory?: boolean } = {},
  ): Promise<BusinessContext> {
    const includeHistory = options.includeMessageHistory ?? true;
    const snapshot = await this.loadCatalogSnapshot(params.businessId);

    const [conversation, customer, openOrder] = await Promise.all([
      this.prisma.conversation.findUniqueOrThrow({
        where: { id: params.conversationId },
        include: {
          campaign: true,
          ...(includeHistory
            ? {
                messages: {
                  orderBy: { createdAt: 'desc' as const },
                  take: 16,
                },
              }
            : {}),
        },
      }),
      this.prisma.customer.findUniqueOrThrow({
        where: { id: params.customerId },
      }),
      this.prisma.order.findFirst({
        where: {
          conversationId: params.conversationId,
          status: { in: OPEN_ORDER_STATUSES },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, orderNumber: true, status: true },
      }),
    ]);

    const historyAsc =
      includeHistory && 'messages' in conversation && conversation.messages
        ? [...conversation.messages].reverse()
        : [];

    return {
      businessId: params.businessId,
      conversationId: params.conversationId,
      customerId: params.customerId,
      campaignId: conversation.campaignId,
      mode: conversation.mode,
      conversionStage: conversation.conversionStage,
      channel: conversation.channel,
      business: snapshot.business,
      agent: snapshot.agent,
      products: snapshot.products,
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
      paymentReviewPending:
        conversation.needsHuman &&
        conversation.handoffReason === PAYMENT_REVIEW_HANDOFF,
      paymentConfirmedForAi: (conversation.aiSummary ?? '').startsWith(
        'PAYMENT_CONFIRMED:',
      ),
      openOrder: openOrder
        ? {
            id: openOrder.id,
            orderNumber: openOrder.orderNumber,
            status: openOrder.status,
          }
        : null,
    };
  }

  private renderCatalogBlock(products: BusinessContext['products']): string {
    return products
      .map((p) => {
        const details =
          formatAttributesLine(p.attributes) ||
          [
            p.sizes.length ? `sizes:${p.sizes.join(',')}` : '',
            p.colors.length ? `colors:${p.colors.join(',')}` : '',
          ]
            .filter(Boolean)
            .join(' · ');
        const base = `- id:${p.id} | ${p.name} | from ${p.priceEgp} EGP | ${
          p.stockQuantity != null
            ? `qty:${p.stockQuantity}`
            : `available:${p.inStock ? 'yes' : 'no'}`
        }${details ? ` | ${details}` : ''}`;
        if (p.variantsSummary) {
          return `${base}\n${p.variantsSummary}`;
        }
        return base;
      })
      .join('\n');
  }

  toPromptBlock(ctx: BusinessContext): string {
    const snapshot = this.catalogCache.get(ctx.businessId);
    const productLines =
      snapshot?.catalogPromptBlock ?? this.renderCatalogBlock(ctx.products);

    return [
      `Business: ${ctx.business.name} (${ctx.business.type})`,
      ctx.business.description ? `About: ${ctx.business.description}` : '',
      ctx.business.operatingArea ? `Area: ${ctx.business.operatingArea}` : '',
      ctx.business.workingHours ? `Hours: ${ctx.business.workingHours}` : '',
      ctx.business.shippingRates
        ? `Shipping: ${ctx.business.shippingRates}`
        : ctx.business.deliveryInfo
          ? `Delivery: ${ctx.business.deliveryInfo}`
          : '',
      ctx.business.paymentInfo ? `Payment: ${ctx.business.paymentInfo}` : '',
      ctx.business.faqs ? `FAQs:\n${ctx.business.faqs}` : '',
      `Agent goal: ${ctx.agent.primaryGoal}`,
      `Tone: ${ctx.agent.tone}`,
      ctx.agent.instructions
        ? `Extra instructions: ${ctx.agent.instructions}`
        : '',
      `Customer known: name=${ctx.customer.name ?? '-'} phone=${ctx.customer.phone ?? '-'}`,
      `Stage: ${ctx.conversionStage}`,
      ctx.paymentReviewPending
        ? 'Payment: transfer screenshot pending merchant review — reassure customer; do NOT createOrder yet; never tell customer the order is officially confirmed.'
        : '',
      ctx.paymentConfirmedForAi
        ? 'Payment: merchant CONFIRMED transfer — you may createOrder if details are complete.'
        : '',
      ctx.openOrder
        ? `Open order for this chat: #${ctx.openOrder.orderNumber} (${ctx.openOrder.status}) — do NOT createOrder again; update payment notes or wait for merchant.`
        : '',
      ctx.campaign
        ? `Campaign: ${ctx.campaign.name} / ${ctx.campaign.objective} / offer: ${ctx.campaign.offer}`
        : '',
      `Catalog:\n${productLines || '- none'}`,
    ]
      .filter(Boolean)
      .join('\n');
  }
}
