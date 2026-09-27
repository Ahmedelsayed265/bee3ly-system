/**
 * Backfill product cost + business shipping zones + order snapshots (no wipe).
 * Run from backend/: node prisma/seed-default-economics.mjs
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const EMAIL = process.env.SEED_EMAIL ?? 'ahmedelsayed2102@icloud.com'

const DEFAULT_SHIPPING_ZONES = [
  {
    id: 'zone-greater-cairo',
    name: 'القاهرة الكبرى',
    governorates: ['cairo', 'giza', 'qalyubia'],
    priceEgp: 45,
  },
  {
    id: 'zone-alex-delta',
    name: 'الإسكندرية والدلتا',
    governorates: [
      'alexandria',
      'beheira',
      'gharbia',
      'monufia',
      'dakahlia',
      'sharqia',
      'kafr_el_sheikh',
      'damietta',
      'port_said',
      'ismailia',
    ],
    priceEgp: 65,
  },
  {
    id: 'zone-upper',
    name: 'الصعيد والبحر الأحمر',
    governorates: [
      'fayoum',
      'beni_suef',
      'minya',
      'asyut',
      'sohag',
      'qena',
      'luxor',
      'aswan',
      'red_sea',
      'new_valley',
      'matrouh',
      'north_sinai',
      'south_sinai',
      'suez',
    ],
    priceEgp: 90,
  },
]

const GOV_ROTATION = [
  'cairo',
  'giza',
  'alexandria',
  'sharqia',
  'cairo',
  'qalyubia',
  'ismailia',
  'cairo',
  'giza',
  'minya',
  'cairo',
  'alexandria',
]

function shippingFor(governorate) {
  const zone = DEFAULT_SHIPPING_ZONES.find((item) =>
    item.governorates.includes(governorate),
  )
  return zone?.priceEgp ?? 65
}

function defaultCost(priceEgp) {
  return Math.max(0, Math.round(priceEgp * 0.48))
}

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: EMAIL },
    include: { memberships: { orderBy: { createdAt: 'asc' }, take: 1 } },
  })
  if (!user?.memberships[0]) {
    throw new Error(`User not found: ${EMAIL}`)
  }
  const businessId = user.memberships[0].businessId

  await prisma.business.update({
    where: { id: businessId },
    data: { shippingZones: DEFAULT_SHIPPING_ZONES },
  })

  const products = await prisma.product.findMany({ where: { businessId } })
  for (const product of products) {
    const costEgp =
      product.costEgp == null ? defaultCost(product.priceEgp) : product.costEgp
    if (product.costEgp == null) {
      await prisma.product.update({
        where: { id: product.id },
        data: { costEgp },
      })
    }
  }

  const productCosts = new Map(
    (
      await prisma.product.findMany({
        where: { businessId },
        select: { id: true, costEgp: true, priceEgp: true },
      })
    ).map((p) => [p.id, p.costEgp ?? defaultCost(p.priceEgp)]),
  )

  const orders = await prisma.order.findMany({
    where: { businessId, status: { not: 'CANCELLED' } },
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  })

  let i = 0
  for (const order of orders) {
    const governorate =
      order.governorate ?? GOV_ROTATION[i % GOV_ROTATION.length]
    const shippingEgp =
      order.shippingEgp ?? shippingFor(governorate)
    i += 1

    await prisma.order.update({
      where: { id: order.id },
      data: {
        governorate,
        shippingEgp,
      },
    })

    for (const item of order.items) {
      const costEgp =
        item.costEgp ??
        (item.productId ? productCosts.get(item.productId) : null) ??
        defaultCost(item.priceEgp)
      if (item.costEgp == null) {
        await prisma.orderItem.update({
          where: { id: item.id },
          data: { costEgp },
        })
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        email: EMAIL,
        businessId,
        products: products.length,
        ordersUpdated: orders.length,
        shippingZones: DEFAULT_SHIPPING_ZONES.length,
      },
      null,
      2,
    ),
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
