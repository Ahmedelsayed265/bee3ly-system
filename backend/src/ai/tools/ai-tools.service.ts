import { BadRequestException, Injectable } from '@nestjs/common';
import { ActorType, LeadStatus, NotificationType } from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  asAttributes,
  formatAttributesLine,
  listAttributeOptions,
  productSizeColorLists,
} from '../../products/product-attributes';
import {
  asVariants,
  findMatchingSku,
  formatVariantLabel,
  formatVariantsDetailForPrompt,
  formatVariantsSummary,
  hasVariantMatrix,
  variantsTotalStock,
} from '../../products/product-variants';
import { isAvailable } from '../../products/stock-mode';
import { presentKnowledge } from '../../businesses/knowledge-text';
import {
  parseShippingZones,
  resolveShippingQuote,
  type ShippingLookup,
  type ShippingPricingMode,
} from '../../businesses/shipping-zones';
import { ORDER_CANCEL_HANDOFF } from '../handoff.constants';
import { PAYMENT_REVIEW_HANDOFF } from '../payment-review.constants';
import { businessAllowsLocalShipping } from '../../businesses/uses-local-shipping';
import { AiContextCacheService } from '../context/ai-context-cache.service';
import { computeOrderTotals } from '../order-prepaid';
import {
  assertAddOrderItemAllowed,
  assertCreateOrderAllowed,
  OPEN_ORDER_STATUSES,
} from '../payment-order.guards';
import type { BusinessContext, ToolName } from '../types';

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/** Map tool args → variant matcher (size/color aliases + custom axis names). */
function variantChoiceFromArgs(
  args: Record<string, unknown>,
): Record<string, string | null> {
  const choice: Record<string, string | null> = {
    size: args.size ? asString(args.size) : null,
    color: args.color ? asString(args.color) : null,
    flavor: args.flavor ? asString(args.flavor) : null,
    option: args.option ? asString(args.option) : null,
    variant: args.variant ? asString(args.variant) : null,
  };
  const extra = args.variantOptions;
  if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
    for (const [key, value] of Object.entries(
      extra as Record<string, unknown>,
    )) {
      const k = key.trim();
      if (!k) continue;
      choice[k] = asString(value);
    }
  }
  return choice;
}

@Injectable()
export class AiToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly aiContextCache: AiContextCacheService,
  ) {}

  private effectiveShippingMode(business: {
    type: string;
    shippingPricingMode: string;
  }): ShippingPricingMode {
    if (
      businessAllowsLocalShipping(business.type) &&
      business.shippingPricingMode === 'LOCAL_AREA'
    ) {
      return 'LOCAL_AREA';
    }
    return 'GOVERNORATE';
  }

  private shippingLookupFromArgs(
    args: Record<string, unknown>,
  ): ShippingLookup {
    return {
      governorate: args.governorate ? asString(args.governorate).trim() : null,
      deliveryArea: args.deliveryArea
        ? asString(args.deliveryArea).trim()
        : null,
      address: args.address ? asString(args.address).trim() : null,
    };
  }

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
      case 'quoteCheckout':
        return this.quoteCheckout(ctx, args);
      case 'createOrder':
        return this.createOrder(ctx, args);
      case 'addOrderItem':
        return this.addOrderItem(ctx, args);
      case 'getOrderStatus':
        return this.getOrderStatus(ctx, args);
      case 'createLead':
        return this.createLead(ctx, args);
      case 'notifyOwner':
        return this.notifyOwner(ctx, args);
      case 'transferToHuman':
        return this.transferToHuman(ctx, args);
      default: {
        const _exhaustive: never = name;
        throw new BadRequestException(`Unknown tool: ${String(_exhaustive)}`);
      }
    }
  }

  private async getProduct(
    ctx: BusinessContext,
    args: Record<string, unknown>,
  ) {
    if (args.productId) {
      return this.prisma.product.findFirst({
        where: {
          id: asString(args.productId),
          businessId: ctx.businessId,
        },
      });
    }
    if (args.name) {
      const q = asString(args.name).toLowerCase();
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

  private async checkStock(
    ctx: BusinessContext,
    args: Record<string, unknown>,
  ) {
    const product = await this.getProduct(ctx, args);
    if (!product) return null;
    const attributes = asAttributes(product.attributes);
    const variants = asVariants(product.variants);
    const chosen = variantChoiceFromArgs(args);
    const matched = hasVariantMatrix(variants)
      ? findMatchingSku(variants, chosen)
      : null;
    const available = matched
      ? matched.stockQuantity > 0
      : isAvailable(product);
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      inStock: available,
      stockQuantity: matched ? matched.stockQuantity : product.stockQuantity,
      attributes,
      details: formatAttributesLine(attributes),
      sizes: productSizeColorLists(product).sizes,
      colors: productSizeColorLists(product).colors,
      priceEgp: matched?.priceEgp ?? product.priceEgp,
      variants: hasVariantMatrix(variants)
        ? formatVariantsSummary(variants)
        : null,
      variantsDetail: hasVariantMatrix(variants)
        ? formatVariantsDetailForPrompt(variants)
        : null,
      variantAxes: hasVariantMatrix(variants)
        ? variants.axes.map((a) => ({
            name: a.name,
            values: a.values,
          }))
        : null,
      selectedVariant: matched
        ? {
            label: formatVariantLabel(matched.options),
            options: matched.options,
            priceEgp: matched.priceEgp,
            stockQuantity: matched.stockQuantity,
          }
        : null,
    };
  }

  private getDeliveryInfo(ctx: BusinessContext) {
    const parts = [
      ctx.business.shippingRates ?? ctx.business.deliveryInfo,
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
      delivery: ctx.business.shippingRates ?? ctx.business.deliveryInfo,
      payment: ctx.business.paymentInfo,
    };
  }

  /** Price breakdown: product line + shipping + grand total (no DB write). */
  private async quoteCheckout(
    ctx: BusinessContext,
    args: Record<string, unknown>,
  ) {
    const product = await this.getProduct(ctx, args);
    if (!product) {
      throw new BadRequestException('Product required for quote');
    }

    const quantity = Math.max(1, Number(args.quantity ?? 1));
    const variants = asVariants(product.variants);
    const chosen = variantChoiceFromArgs(args);

    let unitPrice = product.priceEgp;
    let selectedVariant: {
      label: string;
      options: Record<string, string>;
      priceEgp: number;
      stockQuantity: number;
    } | null = null;

    if (hasVariantMatrix(variants)) {
      const matched = findMatchingSku(variants, chosen);
      if (!matched) {
        throw new BadRequestException(
          `Choose a valid variant (${variants.axes.map((a) => a.name).join(' + ')})`,
        );
      }
      unitPrice = matched.priceEgp;
      selectedVariant = {
        label: formatVariantLabel(matched.options),
        options: matched.options,
        priceEgp: matched.priceEgp,
        stockQuantity: matched.stockQuantity,
      };
    }

    const subtotalEgp = unitPrice * quantity;

    const businessRow = await this.prisma.business.findUniqueOrThrow({
      where: { id: ctx.businessId },
      select: {
        shippingZones: true,
        shippingPricingMode: true,
        type: true,
        paymentInfo: true,
      },
    });
    const pricingMode = this.effectiveShippingMode(businessRow);
    const zones = parseShippingZones(businessRow.shippingZones, pricingMode);
    const lookup = this.shippingLookupFromArgs(args);
    let shippingEgp: number | null = 0;
    let matchedZone: { name: string } | null = null;
    if (zones.length > 0) {
      const resolved = resolveShippingQuote(zones, pricingMode, lookup);
      if (!resolved.ok) {
        throw new BadRequestException(resolved.message);
      }
      shippingEgp = resolved.priceEgp;
      matchedZone = resolved.zone;
    }

    const shipping = shippingEgp ?? 0;
    const grandTotalEgp = subtotalEgp + shipping;
    const unitPriceEgp = unitPrice;

    return {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPriceEgp: unitPrice,
      subtotalEgp,
      shippingEgp: shippingEgp,
      grandTotalEgp,
      governorate: lookup.governorate ?? null,
      deliveryArea: lookup.deliveryArea ?? null,
      shippingZoneName: matchedZone?.name ?? null,
      paymentInfo: presentKnowledge(businessRow.paymentInfo),
      selectedVariant,
      summaryAr: `سعر المنتج: ${subtotalEgp} ج.م (${quantity} × ${unitPriceEgp}) + الشحن: ${shipping} ج.م = الإجمالي ${grandTotalEgp} ج.م`,
    };
  }

  private async resolveOrderLine(
    ctx: BusinessContext,
    args: Record<string, unknown>,
  ) {
    const product = await this.getProduct(ctx, args);
    if (!product) {
      throw new BadRequestException('Product required for order');
    }
    if (!isAvailable(product)) {
      throw new BadRequestException('Product out of stock');
    }

    const attributes = asAttributes(product.attributes);
    const variants = asVariants(product.variants);
    const availableSizes = productSizeColorLists(product).sizes;
    const quantity = Math.max(1, Number(args.quantity ?? 1));
    const size = args.size ? asString(args.size) : null;
    const color = args.color ? asString(args.color) : null;
    const chosen = variantChoiceFromArgs(args);

    let unitPrice = product.priceEgp;
    let unitCost: number | null = product.costEgp;
    let matchedSkuKey: string | null = null;

    if (hasVariantMatrix(variants)) {
      const matched = findMatchingSku(variants, chosen);
      if (!matched) {
        throw new BadRequestException(
          `Choose a valid variant (${variants.axes
            .map((a) => a.name)
            .join(' + ')})`,
        );
      }
      if (quantity > matched.stockQuantity) {
        throw new BadRequestException(
          `Only ${matched.stockQuantity} units available for ${formatVariantLabel(matched.options)}`,
        );
      }
      unitPrice = matched.priceEgp;
      unitCost = matched.costEgp ?? product.costEgp ?? null;
      matchedSkuKey = matched.key;
    } else {
      if (product.stockQuantity != null && quantity > product.stockQuantity) {
        throw new BadRequestException(
          `Only ${product.stockQuantity} units available`,
        );
      }
      if (size && availableSizes.length > 0 && !availableSizes.includes(size)) {
        throw new BadRequestException(`Size ${size} not available`);
      }
      for (const key of ['color', 'flavor', 'option', 'variant'] as const) {
        const chosenValue = args[key] ? asString(args[key]) : null;
        if (!chosenValue) continue;
        const options = listAttributeOptions(
          attributes,
          key === 'color' ? 'colors' : key === 'flavor' ? 'flavors' : `${key}s`,
        );
        const alt = listAttributeOptions(attributes, key);
        const pool = options.length ? options : alt;
        if (pool.length > 0 && !pool.includes(chosenValue)) {
          throw new BadRequestException(`${key} ${chosenValue} not available`);
        }
      }
    }

    return {
      product,
      variants,
      size,
      color,
      quantity,
      unitPrice,
      unitCost,
      matchedSkuKey,
      lineSubtotal: unitPrice * quantity,
    };
  }

  private async applyStockAfterSale(
    ctx: BusinessContext,
    line: {
      product: { id: string; priceEgp: number; stockQuantity: number | null };
      variants: ReturnType<typeof asVariants>;
      matchedSkuKey: string | null;
      quantity: number;
    },
  ) {
    const { product, variants, matchedSkuKey, quantity } = line;
    if (matchedSkuKey) {
      const nextVariants = {
        ...variants,
        skus: variants.skus.map((sku) =>
          sku.key === matchedSkuKey
            ? {
                ...sku,
                stockQuantity: Math.max(0, sku.stockQuantity - quantity),
              }
            : sku,
        ),
      };
      const nextTotal = variantsTotalStock(nextVariants);
      await this.prisma.product.update({
        where: { id: product.id },
        data: {
          variants: nextVariants,
          stockQuantity: nextTotal,
          inStock: nextTotal > 0,
          priceEgp: product.priceEgp,
        },
      });
    } else if (product.stockQuantity != null) {
      const nextQty = Math.max(0, product.stockQuantity - quantity);
      await this.prisma.product.update({
        where: { id: product.id },
        data: {
          stockQuantity: nextQty,
          inStock: nextQty > 0,
        },
      });
    } else if (ctx.business.type === 'REAL_ESTATE') {
      await this.prisma.product.update({
        where: { id: product.id },
        data: { inStock: false, stockQuantity: null },
      });
    }
  }

  private async createOrder(
    ctx: BusinessContext,
    args: Record<string, unknown>,
  ) {
    const paymentMethod = args.paymentMethod
      ? asString(args.paymentMethod).trim()
      : '';
    const orderNotes = args.notes ? asString(args.notes).trim() : '';
    try {
      assertCreateOrderAllowed(ctx, paymentMethod, orderNotes);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'createOrder not allowed',
      );
    }

    const existingOpen = await this.prisma.order.findFirst({
      where: {
        conversationId: ctx.conversationId,
        status: { in: OPEN_ORDER_STATUSES },
      },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    if (existingOpen) {
      throw new BadRequestException(
        `Order #${existingOpen.orderNumber} already exists for this chat — do not create another order`,
      );
    }

    const customerName = asString(
      args.customerName ?? ctx.customer.name,
    ).trim();
    const customerPhone = asString(
      args.customerPhone ?? ctx.customer.phone,
    ).trim();
    if (!customerName || !/^01[0-9]{8,9}$/.test(customerPhone)) {
      throw new BadRequestException(
        'Valid customer name and Egyptian phone required',
      );
    }

    const lineArgsList: Record<string, unknown>[] = [args];
    if (Array.isArray(args.additionalItems)) {
      for (const raw of args.additionalItems) {
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          lineArgsList.push(raw as Record<string, unknown>);
        }
      }
    }

    const resolvedLines = await Promise.all(
      lineArgsList.map((lineArgs) => this.resolveOrderLine(ctx, lineArgs)),
    );
    const productsSubtotal = resolvedLines.reduce(
      (sum, line) => sum + line.lineSubtotal,
      0,
    );

    const last = await this.prisma.order.findFirst({
      where: { businessId: ctx.businessId },
      orderBy: { orderNumber: 'desc' },
    });
    const orderNumber = (last?.orderNumber ?? 1000) + 1;

    const businessRow = await this.prisma.business.findUniqueOrThrow({
      where: { id: ctx.businessId },
      select: { shippingZones: true, shippingPricingMode: true, type: true },
    });
    const pricingMode = this.effectiveShippingMode(businessRow);
    const zones = parseShippingZones(businessRow.shippingZones, pricingMode);
    const shippingLookup = this.shippingLookupFromArgs(args);
    let shippingEgp: number | null = 0;
    if (zones.length > 0) {
      const resolved = resolveShippingQuote(zones, pricingMode, shippingLookup);
      if (!resolved.ok) {
        throw new BadRequestException(resolved.message);
      }
      shippingEgp = resolved.priceEgp;
    }
    const governorate = shippingLookup.governorate ?? null;

    // Keep Messenger/profile display name; order stores its own customerName
    await this.prisma.customer.update({
      where: { id: ctx.customerId },
      data: {
        ...(ctx.customer.name ? {} : { name: customerName }),
        phone: customerPhone,
      },
    });

    const noteParts: string[] = [];
    const address = args.address ? asString(args.address).trim() : '';
    const deliveryArea = shippingLookup.deliveryArea?.trim() ?? '';
    if (deliveryArea) noteParts.push(`المنطقة: ${deliveryArea}`);
    if (address) noteParts.push(`العنوان: ${address}`);
    if (paymentMethod) noteParts.push(`الدفع: ${paymentMethod}`);
    if (orderNotes) noteParts.push(orderNotes);

    const order = await this.prisma.order.create({
      data: {
        businessId: ctx.businessId,
        customerId: ctx.customerId,
        conversationId: ctx.conversationId,
        campaignId: ctx.campaignId,
        orderNumber,
        totalEgp: productsSubtotal,
        customerName,
        customerPhone,
        governorate,
        shippingEgp,
        notes: noteParts.length ? noteParts.join(' | ') : null,
        createdBy: ActorType.AI,
        items: {
          create: resolvedLines.map((line) => ({
            productId: line.product.id,
            name: line.product.name,
            size: line.size,
            color: line.color,
            quantity: line.quantity,
            priceEgp: line.unitPrice,
            costEgp: line.unitCost,
          })),
        },
      },
      include: { items: true },
    });

    for (const line of resolvedLines) {
      await this.applyStockAfterSale(ctx, line);
    }

    const productSummary = resolvedLines
      .map((line) => line.product.name)
      .join('، ');

    const openLeads = await this.prisma.lead.updateMany({
      where: {
        businessId: ctx.businessId,
        customerId: ctx.customerId,
        status: { in: [LeadStatus.NEW, LeadStatus.QUALIFIED] },
      },
      data: { status: LeadStatus.CONVERTED },
    });

    if (openLeads.count === 0) {
      const existingConverted = await this.prisma.lead.findFirst({
        where: {
          businessId: ctx.businessId,
          customerId: ctx.customerId,
          conversationId: ctx.conversationId,
          status: LeadStatus.CONVERTED,
        },
      });
      if (!existingConverted) {
        await this.prisma.lead.create({
          data: {
            businessId: ctx.businessId,
            customerId: ctx.customerId,
            conversationId: ctx.conversationId,
            campaignId: ctx.campaignId,
            status: LeadStatus.CONVERTED,
            intent: 'PURCHASE_INTENT',
            notes: `Order #${orderNumber}`,
            createdBy: ActorType.AI,
          },
        });
      }
    }

    await this.prisma.conversation.update({
      where: { id: ctx.conversationId },
      data: { conversionStage: 'CONVERTED' },
    });

    await this.notifications.create(ctx.businessId, {
      type: NotificationType.ORDER,
      title: `طلب جديد #${orderNumber}`,
      body: `${customerName} · ${productSummary} · ${order.totalEgp} ج.م · عبر AI`,
      data: {
        orderId: order.id,
        orderNumber,
        conversationId: ctx.conversationId,
        campaignId: ctx.campaignId,
      },
    });

    this.aiContextCache.invalidate(ctx.businessId);

    const ship = order.shippingEgp ?? 0;
    const orderLinesAr = order.items
      .map(
        (i) =>
          `${i.name}${i.size ? ` (${i.size})` : ''} ×${i.quantity} = ${i.priceEgp * i.quantity} ج.م`,
      )
      .join('؛ ');
    return {
      ...order,
      grandTotalEgp: order.totalEgp + ship,
      orderLinesAr,
      summaryAr: `${orderLinesAr} | المنتجات ${order.totalEgp} ج.م + الشحن ${ship} ج.م = ${order.totalEgp + ship} ج.م`,
    };
  }

  private async addOrderItem(
    ctx: BusinessContext,
    args: Record<string, unknown>,
  ) {
    try {
      assertAddOrderItemAllowed(ctx);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'addOrderItem not allowed',
      );
    }

    const openOrder = await this.prisma.order.findFirst({
      where: {
        id: ctx.openOrder!.id,
        conversationId: ctx.conversationId,
        status: { in: OPEN_ORDER_STATUSES },
      },
      include: { items: true },
    });
    if (!openOrder) {
      throw new BadRequestException('Open order not found');
    }

    const product = await this.getProduct(ctx, args);
    if (!product) {
      throw new BadRequestException('Product required');
    }
    if (!isAvailable(product)) {
      throw new BadRequestException('Product out of stock');
    }

    const attributes = asAttributes(product.attributes);
    const variants = asVariants(product.variants);
    const availableSizes = productSizeColorLists(product).sizes;
    const quantity = Math.max(1, Number(args.quantity ?? 1));
    const size = args.size ? asString(args.size) : null;
    const color = args.color ? asString(args.color) : null;
    const chosen = variantChoiceFromArgs(args);

    let unitPrice = product.priceEgp;
    let unitCost: number | null = product.costEgp;
    let matchedSkuKey: string | null = null;

    if (hasVariantMatrix(variants)) {
      const matched = findMatchingSku(variants, chosen);
      if (!matched) {
        throw new BadRequestException(
          `Choose a valid variant (${variants.axes
            .map((a) => a.name)
            .join(' + ')})`,
        );
      }
      if (quantity > matched.stockQuantity) {
        throw new BadRequestException(
          `Only ${matched.stockQuantity} units available for ${formatVariantLabel(matched.options)}`,
        );
      }
      unitPrice = matched.priceEgp;
      unitCost = matched.costEgp ?? product.costEgp ?? null;
      matchedSkuKey = matched.key;
    } else {
      if (product.stockQuantity != null && quantity > product.stockQuantity) {
        throw new BadRequestException(
          `Only ${product.stockQuantity} units available`,
        );
      }
      if (size && availableSizes.length > 0 && !availableSizes.includes(size)) {
        throw new BadRequestException(`Size ${size} not available`);
      }
      for (const key of ['color', 'flavor', 'option', 'variant'] as const) {
        const chosenValue = args[key] ? asString(args[key]) : null;
        if (!chosenValue) continue;
        const options = listAttributeOptions(
          attributes,
          key === 'color' ? 'colors' : key === 'flavor' ? 'flavors' : `${key}s`,
        );
        const alt = listAttributeOptions(attributes, key);
        const pool = options.length ? options : alt;
        if (pool.length > 0 && !pool.includes(chosenValue)) {
          throw new BadRequestException(`${key} ${chosenValue} not available`);
        }
      }
    }

    const lineSubtotal = unitPrice * quantity;

    const existingLine = openOrder.items.find(
      (item) =>
        item.productId === product.id &&
        (item.size ?? null) === size &&
        (item.color ?? null) === color &&
        item.priceEgp === unitPrice,
    );

    if (existingLine) {
      await this.prisma.orderItem.update({
        where: { id: existingLine.id },
        data: { quantity: existingLine.quantity + quantity },
      });
    } else {
      await this.prisma.orderItem.create({
        data: {
          orderId: openOrder.id,
          productId: product.id,
          name: product.name,
          size,
          color,
          quantity,
          priceEgp: unitPrice,
          costEgp: unitCost,
        },
      });
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: openOrder.id },
      data: { totalEgp: openOrder.totalEgp + lineSubtotal },
      include: { items: true },
    });

    if (matchedSkuKey) {
      const nextVariants = {
        ...variants,
        skus: variants.skus.map((sku) =>
          sku.key === matchedSkuKey
            ? {
                ...sku,
                stockQuantity: Math.max(0, sku.stockQuantity - quantity),
              }
            : sku,
        ),
      };
      const nextTotal = variantsTotalStock(nextVariants);
      await this.prisma.product.update({
        where: { id: product.id },
        data: {
          variants: nextVariants,
          stockQuantity: nextTotal,
          inStock: nextTotal > 0,
          priceEgp: product.priceEgp,
        },
      });
    } else if (product.stockQuantity != null) {
      const nextQty = Math.max(0, product.stockQuantity - quantity);
      await this.prisma.product.update({
        where: { id: product.id },
        data: {
          stockQuantity: nextQty,
          inStock: nextQty > 0,
        },
      });
    }

    this.aiContextCache.invalidate(ctx.businessId);

    const totals = computeOrderTotals(updatedOrder);
    const verifiedPrepaidEgp =
      totals.verifiedPrepaidEgp > 0
        ? totals.verifiedPrepaidEgp
        : (ctx.openOrder?.verifiedPrepaidEgp ?? 0);
    const balanceDueEgp = Math.max(
      0,
      totals.grandTotalEgp - verifiedPrepaidEgp,
    );

    const businessRow = await this.prisma.business.findUniqueOrThrow({
      where: { id: ctx.businessId },
      select: { paymentInfo: true },
    });

    return {
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      added: {
        productName: product.name,
        quantity,
        unitPriceEgp: unitPrice,
        lineSubtotalEgp: lineSubtotal,
      },
      productsSubtotalEgp: totals.productsSubtotalEgp,
      shippingEgp: totals.shippingEgp,
      grandTotalEgp: totals.grandTotalEgp,
      verifiedPrepaidEgp,
      balanceDueEgp,
      paymentInfo: presentKnowledge(businessRow.paymentInfo),
      summaryAr:
        balanceDueEgp > 0
          ? `تمت إضافة ${product.name} (${lineSubtotal} ج.م). إجمالي الطلب ${totals.grandTotalEgp} ج.م (شامل الشحن). مدفوع ومُؤكَّد ${verifiedPrepaidEgp} ج.م — المطلوب تحويل ${balanceDueEgp} ج.م فقط للبند الجديد.`
          : `تمت إضافة ${product.name}. إجمالي الطلب ${totals.grandTotalEgp} ج.م.`,
    };
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
        intent: asString(args.intent, 'LEAD_INTENT'),
        notes: args.notes ? asString(args.notes) : null,
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
      title: asString(args.title, 'تنبيه'),
      body: asString(args.body),
      data: { conversationId: ctx.conversationId },
    });
    return { ok: true };
  }

  private async transferToHuman(
    ctx: BusinessContext,
    args: Record<string, unknown>,
  ) {
    const reason = asString(args.reason, 'طلب العميل أو حاجة لتدخل بشري');
    const paymentReview = reason === PAYMENT_REVIEW_HANDOFF;
    const orderCancel = reason === ORDER_CANCEL_HANDOFF;
    await this.prisma.conversation.update({
      where: { id: ctx.conversationId },
      data: {
        needsHuman: true,
        status: 'NEEDS_HUMAN',
        mode: paymentReview ? 'AI' : 'HUMAN',
        conversionStage: paymentReview ? 'DATA_COLLECTION' : 'HUMAN_HANDOFF',
        handoffReason: reason,
        aiSummary: args.summary ? asString(args.summary) : null,
      },
    });
    const notifyTitle = paymentReview
      ? 'إيصال يحتاج تأكيد'
      : orderCancel
        ? 'طلب إلغاء أوردر'
        : 'تحويل لممثل';
    const notifyBody = paymentReview
      ? asString(
          args.summary,
          'تم استلام إيصال تحويل — راجع الصورة وأكد من صندوق الوارد',
        )
      : orderCancel
        ? asString(args.summary, 'العميل طلب إلغاء الطلب — راجع المحادثة وقرّر')
        : asString(args.summary, reason);
    await this.notifications.create(ctx.businessId, {
      type:
        paymentReview || orderCancel
          ? NotificationType.ORDER
          : NotificationType.HANDOFF,
      title: notifyTitle,
      body: notifyBody,
      data: {
        conversationId: ctx.conversationId,
        ...(paymentReview ? { kind: 'PAYMENT_RECEIPT' } : {}),
        ...(orderCancel ? { kind: 'ORDER_CANCEL' } : {}),
      },
    });
    return { ok: true, reason };
  }
}
