import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { BusinessAccessService } from '../common/business-access.service';
import { pageMeta, pageWindow } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { parseShippingZones, zonePrice } from '../businesses/shipping-zones';
import {
  asVariants,
  findMatchingSku,
  variantsTotalStock,
} from '../products/product-variants';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
  ) {}

  async list(userId: string, page = 1, limit = 10, campaignId?: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const window = pageWindow(page, limit);
    const where = {
      businessId,
      ...(campaignId ? { campaignId } : {}),
    };
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: true, customer: true },
        orderBy: { createdAt: 'desc' },
        skip: window.skip,
        take: window.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { orders, ...pageMeta(total, window.page, window.limit) };
  }

  async getOne(userId: string, id: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const order = await this.prisma.order.findFirst({
      where: { id, businessId },
      include: { items: true, customer: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return { order };
  }

  async updateStatus(userId: string, id: string, status: OrderStatus) {
    const businessId = await this.access.requireBusinessId(userId);
    const existing = await this.prisma.order.findFirst({
      where: { id, businessId },
      include: {
        items: { include: { product: true } },
      },
    });
    if (!existing) throw new NotFoundException('Order not found');

    const order = await this.prisma.$transaction(async (tx) => {
      if (
        existing.status !== OrderStatus.RETURNED &&
        status === OrderStatus.RETURNED
      ) {
        await this.adjustStock(tx, existing.items, 1);
      }
      if (
        existing.status === OrderStatus.RETURNED &&
        status !== OrderStatus.RETURNED
      ) {
        await this.adjustStock(tx, existing.items, -1);
      }
      return tx.order.update({
        where: { id },
        data: { status },
        include: { items: true },
      });
    });
    return { order };
  }

  async setGovernorate(userId: string, id: string, governorate: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const existing = await this.prisma.order.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Order not found');
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { shippingZones: true },
    });
    const shippingEgp = zonePrice(
      parseShippingZones(business.shippingZones),
      governorate,
    );
    const order = await this.prisma.order.update({
      where: { id },
      data: { governorate, shippingEgp },
      include: { items: true },
    });
    return { order };
  }

  /**
   * A return puts the units back. direction 1 restocks, -1 undoes that.
   * Shipping is not reversed; attribution counts it as a loss.
   */
  private async adjustStock(
    tx: Prisma.TransactionClient,
    items: Array<{
      quantity: number;
      size: string | null;
      color: string | null;
      product: {
        id: string;
        stockQuantity: number | null;
        variants: Prisma.JsonValue;
      } | null;
    }>,
    direction: 1 | -1,
  ) {
    for (const item of items) {
      const product = item.product;
      if (!product || product.stockQuantity == null) continue;
      const variants = asVariants(product.variants);
      const matched = findMatchingSku(variants, {
        size: item.size,
        color: item.color,
      });
      if (matched) {
        const nextVariants = {
          ...variants,
          skus: variants.skus.map((sku) =>
            sku.key === matched.key
              ? {
                  ...sku,
                  stockQuantity: Math.max(
                    0,
                    sku.stockQuantity + direction * item.quantity,
                  ),
                }
              : sku,
          ),
        };
        const nextTotal = variantsTotalStock(nextVariants);
        await tx.product.update({
          where: { id: product.id },
          data: {
            variants: nextVariants as unknown as Prisma.InputJsonValue,
            stockQuantity: nextTotal,
            inStock: nextTotal > 0,
          },
        });
        continue;
      }
      const nextQty = Math.max(
        0,
        product.stockQuantity + direction * item.quantity,
      );
      await tx.product.update({
        where: { id: product.id },
        data: { stockQuantity: nextQty, inStock: nextQty > 0 },
      });
    }
  }
}
