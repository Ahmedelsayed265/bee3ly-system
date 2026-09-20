import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ActorType,
  LeadStatus,
  NotificationType,
  type Product,
} from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { BusinessContext, ToolName } from '../types';

@Injectable()
export class AiToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async execute(
    name: ToolName,
    ctx: BusinessContext,
    args: Record<string, unknown> = {},
  ) {
    switch (name) {
      case 'getProduct':
        return this.getProduct(ctx, args);
      case 'checkStock':
        return this.checkStock(ctx, args);
      case 'getDeliveryInfo':
        return this.getDeliveryInfo(ctx);
      case 'getBusinessInfo':
        return this.getBusinessInfo(ctx);
      case 'getFAQ':
        return { faqs: ctx.business.faqs };
      case 'createOrder':
        return this.createOrder(ctx, args);
      case 'getOrderStatus':
        return this.getOrderStatus(ctx, args);
      case 'createLead':
        return this.createLead(ctx, args);
      case 'notifyOwner':
        return this.notifyOwner(ctx, args);
      case 'transferToHuman':
        return this.transferToHuman(ctx, args);
      default:
        throw new BadRequestException(`Unknown tool: ${name}`);
    }
  }

  private async getProduct(ctx: BusinessContext, args: Record<string, unknown>) {
    if (args.productId) {
      return this.prisma.product.findFirst({
        where: { id: String(args.productId), businessId: ctx.businessId },
      });
    }
    if (args.name) {
      const q = String(args.name).toLowerCase();
      const match = ctx.products.find((p) => p.name.toLowerCase().includes(q));
      if (match) {
        return this.prisma.product.findFirst({
          where: { id: match.id, businessId: ctx.businessId },
        });
      }
    }
    return this.prisma.product.findFirst({
      where: { businessId: ctx.businessId },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async checkStock(ctx: BusinessContext, args: Record<string, unknown>) {
    const product = (await this.getProduct(ctx, args)) as Product | null;
    if (!product) return null;
    return {
      id: product.id,
      name: product.name,
      inStock: product.inStock,
      sizes: product.sizes,
      colors: product.colors,
      priceEgp: product.priceEgp,
    };
  }

  private getDeliveryInfo(ctx: BusinessContext) {
    const parts = [
      ctx.business.deliveryInfo,
      ctx.business.workingHours
        ? `ساعات العمل: ${ctx.business.workingHours}`
        : null,
      ctx.business.paymentInfo ? `الدفع: ${ctx.business.paymentInfo}` : null,
    ].filter(Boolean);
    return { text: parts.join('\n') || null };
  }

  private getBusinessInfo(ctx: BusinessContext) {
    return {
      name: ctx.business.name,
      type: ctx.business.type,
      description: ctx.business.description,
      area: ctx.business.operatingArea,
      hours: ctx.business.workingHours,
      delivery: ctx.business.deliveryInfo,
      payment: ctx.business.paymentInfo,
    };
  }

  private async createOrder(
    ctx: BusinessContext,
    args: Record<string, unknown>,
  ) {
    const product = (await this.getProduct(ctx, args)) as Product | null;
    if (!product) {
      throw new BadRequestException('Product required for order');
    }
    if (!product.inStock) {
      throw new BadRequestException('Product out of stock');
    }

    const customerName = String(
      args.customerName ?? ctx.customer.name ?? '',
    ).trim();
    const customerPhone = String(
      args.customerPhone ?? ctx.customer.phone ?? '',
    ).trim();
    if (!customerName || !/^01[0-9]{8,9}$/.test(customerPhone)) {
      throw new BadRequestException('Valid customer name and Egyptian phone required');
    }

    const quantity = Math.max(1, Number(args.quantity ?? 1));
    const size = args.size ? String(args.size) : null;
    if (size && product.sizes.length > 0 && !product.sizes.includes(size)) {
      throw new BadRequestException(`Size ${size} not available`);
    }

    const last = await this.prisma.order.findFirst({
      where: { businessId: ctx.businessId },
      orderBy: { orderNumber: 'desc' },
    });
    const orderNumber = (last?.orderNumber ?? 1000) + 1;

    await this.prisma.customer.update({
      where: { id: ctx.customerId },
      data: { name: customerName, phone: customerPhone },
    });

    const order = await this.prisma.order.create({
      data: {
        businessId: ctx.businessId,
        customerId: ctx.customerId,
        conversationId: ctx.conversationId,
        campaignId: ctx.campaignId,
        orderNumber,
        totalEgp: product.priceEgp * quantity,
        customerName,
        customerPhone,
        createdBy: ActorType.AI,
        items: {
          create: [
            {
              productId: product.id,
              name: product.name,
              size,
              quantity,
              priceEgp: product.priceEgp,
            },
          ],
        },
      },
      include: { items: true },
    });

    await this.prisma.lead.updateMany({
      where: {
        businessId: ctx.businessId,
        customerId: ctx.customerId,
        status: { in: [LeadStatus.NEW, LeadStatus.QUALIFIED] },
      },
      data: { status: LeadStatus.CONVERTED },
    });

    await this.prisma.conversation.update({
      where: { id: ctx.conversationId },
      data: { conversionStage: 'CONVERTED' },
    });

    await this.notifications.create(ctx.businessId, {
      type: NotificationType.ORDER,
      title: `طلب جديد #${orderNumber}`,
      body: `${customerName} · ${product.name} · ${order.totalEgp} ج.م · عبر AI`,
      data: {
        orderId: order.id,
        orderNumber,
        conversationId: ctx.conversationId,
        campaignId: ctx.campaignId,
      },
    });

    return order;
  }

  private async getOrderStatus(
    ctx: BusinessContext,
    args: Record<string, unknown>,
  ) {
    if (args.orderNumber) {
      return this.prisma.order.findFirst({
        where: {
          businessId: ctx.businessId,
          orderNumber: Number(args.orderNumber),
        },
        include: { items: true },
      });
    }
    return this.prisma.order.findFirst({
      where: {
        businessId: ctx.businessId,
        customerId: ctx.customerId,
      },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  private async createLead(
    ctx: BusinessContext,
    args: Record<string, unknown>,
  ) {
    const lead = await this.prisma.lead.create({
      data: {
        businessId: ctx.businessId,
        customerId: ctx.customerId,
        conversationId: ctx.conversationId,
        campaignId: ctx.campaignId,
        status: LeadStatus.NEW,
        intent: String(args.intent ?? 'LEAD_INTENT'),
        notes: args.notes ? String(args.notes) : null,
        createdBy: ActorType.AI,
      },
    });

    await this.notifications.create(ctx.businessId, {
      type: NotificationType.LEAD,
      title: 'ليد جديد',
      body: `${ctx.customer.name ?? 'عميل'} · ${lead.intent ?? ''} · عبر AI`,
      data: { leadId: lead.id, conversationId: ctx.conversationId },
    });

    return lead;
  }

  private async notifyOwner(
    ctx: BusinessContext,
    args: Record<string, unknown>,
  ) {
    await this.notifications.create(ctx.businessId, {
      type: NotificationType.SYSTEM,
      title: String(args.title ?? 'تنبيه'),
      body: String(args.body ?? ''),
      data: { conversationId: ctx.conversationId },
    });
    return { ok: true };
  }

  private async transferToHuman(
    ctx: BusinessContext,
    args: Record<string, unknown>,
  ) {
    const reason = String(args.reason ?? 'طلب العميل أو حاجة لتدخل بشري');
    await this.prisma.conversation.update({
      where: { id: ctx.conversationId },
      data: {
        needsHuman: true,
        status: 'NEEDS_HUMAN',
        mode: 'HUMAN',
        conversionStage: 'HUMAN_HANDOFF',
        handoffReason: reason,
        aiSummary: args.summary ? String(args.summary) : null,
      },
    });
    await this.notifications.create(ctx.businessId, {
      type: NotificationType.HANDOFF,
      title: 'تحويل لممثل',
      body: reason,
      data: { conversationId: ctx.conversationId },
    });
    return { ok: true, reason };
  }
}
