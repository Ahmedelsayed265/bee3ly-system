import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import {
  parseShippingZones,
  zonePrice,
  type ShippingZone,
} from '../businesses/shipping-zones';
import { PrismaService } from '../prisma/prisma.service';
import type { ChainInput } from './campaign-metrics';

type MoneyLine = {
  cost: number | null;
};

type Bucket = {
  orders: number;
  revenueEgp: number;
  cogs: number;
  cogsMissing: boolean;
  shipping: number;
  shippingMissing: boolean;
  returnedOrders: number;
  returnedRevenueEgp: number;
  returnShipping: number;
  returnShippingMissing: boolean;
};

export type AttributionChain = ChainInput & {
  returnedOrders: number;
  returnedRevenueEgp: number;
};

@Injectable()
export class AttributionService {
  constructor(private readonly prisma: PrismaService) {}

  async chains(businessId: string) {
    const [conversations, leads, byConversation, byLead, orders, business] =
      await Promise.all([
        this.prisma.conversation.count({ where: { businessId } }),
        this.prisma.lead.count({ where: { businessId } }),
        this.prisma.conversation.groupBy({
          by: ['campaignId'],
          where: { businessId },
          _count: { _all: true },
        }),
        this.prisma.lead.groupBy({
          by: ['campaignId'],
          where: { businessId },
          _count: { _all: true },
        }),
        this.prisma.order.findMany({
          where: {
            businessId,
            status: { not: OrderStatus.CANCELLED },
          },
          select: {
            campaignId: true,
            status: true,
            totalEgp: true,
            governorate: true,
            shippingEgp: true,
            items: {
              select: {
                quantity: true,
                costEgp: true,
                product: { select: { costEgp: true } },
              },
            },
          },
        }),
        this.prisma.business.findUniqueOrThrow({
          where: { id: businessId },
          select: { shippingZones: true },
        }),
      ]);
    const zones = parseShippingZones(business.shippingZones);

    const conversationCounts = new Map(
      byConversation.map((row) => [row.campaignId, row._count._all]),
    );
    const leadCounts = new Map(
      byLead.map((row) => [row.campaignId, row._count._all]),
    );
    const buckets = new Map<string | null, Bucket>();
    const bucketFor = (campaignId: string | null) => {
      const existing = buckets.get(campaignId);
      if (existing) return existing;
      const created = emptyBucket();
      buckets.set(campaignId, created);
      return created;
    };

    for (const order of orders) {
      addOrder(bucketFor(order.campaignId), order, zones);
    }

    const businessBucket = emptyBucket();
    for (const bucket of buckets.values()) mergeBucket(businessBucket, bucket);

    const chainFor = (campaignId: string | null): AttributionChain => {
      const bucket = buckets.get(campaignId) ?? emptyBucket();
      return toChain(
        conversationCounts.get(campaignId) ?? 0,
        leadCounts.get(campaignId) ?? 0,
        bucket,
      );
    };

    return {
      business: toChain(conversations, leads, businessBucket),
      forCampaign: chainFor,
      unattributed: chainFor(null),
    };
  }
}

function lineMoney(item: {
  quantity: number;
  costEgp: number | null;
  product: { costEgp: number | null } | null;
}): MoneyLine {
  const cost = item.costEgp ?? item.product?.costEgp ?? null;
  return { cost: cost == null ? null : cost * item.quantity };
}

function orderShipping(
  order: { governorate: string | null; shippingEgp: number | null },
  zones: ShippingZone[],
) {
  if (order.shippingEgp != null) return order.shippingEgp;
  return zonePrice(zones, order.governorate);
}

function addOrder(
  bucket: Bucket,
  order: {
    status: OrderStatus;
    totalEgp: number;
    governorate: string | null;
    shippingEgp: number | null;
    items: Array<{
      quantity: number;
      costEgp: number | null;
      product: { costEgp: number | null } | null;
    }>;
  },
  zones: ShippingZone[],
) {
  const shipping = orderShipping(order, zones);
  if (order.status === OrderStatus.RETURNED) {
    bucket.returnedOrders += 1;
    bucket.returnedRevenueEgp += order.totalEgp;
    if (shipping == null) bucket.returnShippingMissing = true;
    else bucket.returnShipping += shipping;
    return;
  }

  bucket.orders += 1;
  bucket.revenueEgp += order.totalEgp;
  if (shipping == null) bucket.shippingMissing = true;
  else bucket.shipping += shipping;
  if (order.items.length === 0) {
    bucket.cogsMissing = true;
    return;
  }
  for (const item of order.items) {
    const line = lineMoney(item);
    if (line.cost == null) bucket.cogsMissing = true;
    else bucket.cogs += line.cost;
  }
}

function emptyBucket(): Bucket {
  return {
    orders: 0,
    revenueEgp: 0,
    cogs: 0,
    cogsMissing: false,
    shipping: 0,
    shippingMissing: false,
    returnedOrders: 0,
    returnedRevenueEgp: 0,
    returnShipping: 0,
    returnShippingMissing: false,
  };
}

function mergeBucket(into: Bucket, from: Bucket) {
  into.orders += from.orders;
  into.revenueEgp += from.revenueEgp;
  into.cogs += from.cogs;
  into.cogsMissing = into.cogsMissing || from.cogsMissing;
  into.shipping += from.shipping;
  into.shippingMissing = into.shippingMissing || from.shippingMissing;
  into.returnedOrders += from.returnedOrders;
  into.returnedRevenueEgp += from.returnedRevenueEgp;
  into.returnShipping += from.returnShipping;
  into.returnShippingMissing =
    into.returnShippingMissing || from.returnShippingMissing;
}

function toChain(
  conversations: number,
  leads: number,
  bucket: Bucket,
): AttributionChain {
  return {
    conversations,
    leads,
    orders: bucket.orders,
    revenueEgp: bucket.revenueEgp,
    costOfGoodsEgp: bucket.cogsMissing ? null : bucket.cogs,
    shippingEgp: bucket.shippingMissing ? null : bucket.shipping,
    returnShippingEgp: bucket.returnShippingMissing ? null : bucket.returnShipping,
    returnedOrders: bucket.returnedOrders,
    returnedRevenueEgp: bucket.returnedRevenueEgp,
  };
}
