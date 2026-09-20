/**
 * Demo seed for ahmedelsayed2102@icloud.com — fills products, chats, leads, orders, notifications.
 * Run: node prisma/seed-demo-user.mjs
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const EMAIL = 'ahmedelsayed2102@icloud.com'
const prisma = new PrismaClient()

function daysAgo(n, hour = 12) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, 15 + n, 0, 0)
  return d
}

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: EMAIL },
    include: { memberships: true },
  })
  if (!user?.memberships[0]) {
    throw new Error(`User not found: ${EMAIL}`)
  }
  const businessId = user.memberships[0].businessId

  await prisma.business.update({
    where: { id: businessId },
    data: {
      name: 'Ahmed-dev',
      type: 'ECOMMERCE',
      plan: 'GROWTH',
      description: 'مكملات غذائية وبروتين للرياضيين',
      averagePriceEgp: 850,
      operatingArea: 'القاهرة والإسكندرية',
      contactChannels: ['FACEBOOK', 'INSTAGRAM'],
      primaryGoal: 'INCREASE_SALES',
      deliveryInfo: 'توصيل خلال 24–48 ساعة · 50 ج.م داخل القاهرة · مجاني فوق 1500 ج.م',
      workingHours: 'السبت–الخميس 10 ص – 11 م',
      paymentInfo: 'كاش عند الاستلام · فودافون كاش · إنستاباي',
      faqs: 'هل المنتج أصلي؟ نعم، استيراد رسمي.\nممكن أرجع؟ خلال 14 يوم بشرط عدم الفتح.',
      onboardingCompletedAt: new Date(),
    },
  })

  await prisma.aIAgent.upsert({
    where: { businessId },
    create: {
      businessId,
      primaryGoal: 'GET_ORDERS',
      secondaryGoals: ['ANSWER_QUESTIONS', 'QUALIFY', 'HUMAN_HANDOFF'],
      isActive: true,
    },
    update: {
      primaryGoal: 'GET_ORDERS',
      isActive: true,
    },
  })

  // Wipe demo domain rows for a clean fill (keep user/business)
  await prisma.orderItem.deleteMany({
    where: { order: { businessId } },
  })
  await prisma.order.deleteMany({ where: { businessId } })
  await prisma.lead.deleteMany({ where: { businessId } })
  await prisma.message.deleteMany({
    where: { conversation: { businessId } },
  })
  await prisma.conversation.deleteMany({ where: { businessId } })
  await prisma.notification.deleteMany({ where: { businessId } })
  await prisma.product.deleteMany({ where: { businessId } })
  await prisma.customer.deleteMany({ where: { businessId } })
  await prisma.socialAccount.deleteMany({ where: { businessId } })

  await prisma.socialAccount.createMany({
    data: [
      {
        businessId,
        platform: 'FACEBOOK',
        externalId: 'demo-fb-page-ahmed',
        displayName: 'Ahmed-dev · Facebook',
        accessTokenEnc: 'demo',
      },
      {
        businessId,
        platform: 'INSTAGRAM',
        externalId: 'demo-ig-ahmed',
        displayName: 'Ahmed-dev · Instagram',
        accessTokenEnc: 'demo',
      },
    ],
  })

  const products = await Promise.all(
    [
      {
        name: 'واي بروتين شوكولاتة 2كجم',
        description: '26g بروتين لكل سكوب',
        priceEgp: 1850,
        attributes: { sizes: ['2كجم'], flavors: ['شوكولاتة'], protein_g: 26 },
        sizes: ['2كجم'],
        colors: ['شوكولاتة'],
        stockQuantity: 40,
        inStock: true,
      },
      {
        name: 'كرياتين مونوهيدرات 300جم',
        description: '5g يوميًا',
        priceEgp: 450,
        attributes: { sizes: ['300جم'], serving: '5g' },
        sizes: ['300جم'],
        colors: [],
        stockQuantity: 80,
        inStock: true,
      },
      {
        name: 'BCAA أمينو 60 سيرف',
        priceEgp: 620,
        attributes: { sizes: ['60 سيرف'], flavors: ['مانجو', 'توت'] },
        sizes: ['60 سيرف'],
        colors: ['مانجو', 'توت'],
        stockQuantity: 35,
        inStock: true,
      },
      {
        name: 'مالتي فيتامين يومي',
        priceEgp: 280,
        attributes: { sizes: ['90 قرص'] },
        sizes: ['90 قرص'],
        colors: [],
        stockQuantity: 50,
        inStock: true,
      },
      {
        name: 'بري ورك آوت',
        priceEgp: 750,
        attributes: { sizes: ['30 سيرف'], flavors: ['تفاح أخضر'] },
        sizes: ['30 سيرف'],
        colors: ['تفاح أخضر'],
        stockQuantity: 0,
        inStock: false,
      },
      {
        name: 'أوميغا 3 فيش أويل',
        priceEgp: 390,
        attributes: { sizes: ['60 كبسولة'] },
        sizes: ['60 كبسولة'],
        colors: [],
        stockQuantity: 22,
        inStock: true,
      },
    ].map((p) => prisma.product.create({ data: { businessId, ...p } })),
  )

  const customersData = [
    { name: 'سارة أحمد', phone: '01012345678', platform: 'INSTAGRAM' },
    { name: 'محمد علي', phone: '01098765432', platform: 'FACEBOOK' },
    { name: 'نور حسن', phone: '01123456789', platform: 'INSTAGRAM' },
    { name: 'عمر خالد', phone: '01234567890', platform: 'FACEBOOK' },
    { name: 'ليلى حسن', phone: '01555556666', platform: 'INSTAGRAM' },
    { name: 'كريم يوسف', phone: '01000001111', platform: 'FACEBOOK' },
    { name: 'هدى سمير', phone: '01112223334', platform: 'INSTAGRAM' },
    { name: 'ياسين فادي', phone: '01055667788', platform: 'FACEBOOK' },
  ]

  const customers = []
  for (const c of customersData) {
    customers.push(
      await prisma.customer.create({
        data: {
          businessId,
          name: c.name,
          phone: c.phone,
          platform: c.platform,
          externalId: `demo-${c.phone}`,
        },
      }),
    )
  }

  const chatScripts = [
    {
      customer: customers[0],
      channel: 'INSTAGRAM',
      messages: [
        { role: 'CUSTOMER', content: 'الواي بروتين بكام؟', hoursAgo: 2 },
        {
          role: 'AI',
          content: 'واي بروتين شوكولاتة 2كجم بـ 1,850 ج.م 💪',
          hoursAgo: 1.9,
        },
        { role: 'CUSTOMER', content: 'تمام عايزة أطلب — سارة أحمد - 01012345678', hoursAgo: 1.5 },
        {
          role: 'AI',
          content: 'تم تسجيل الطلب ✅ هيتأكد خلال شوية.',
          hoursAgo: 1.4,
        },
      ],
    },
    {
      customer: customers[3],
      channel: 'FACEBOOK',
      messages: [
        { role: 'CUSTOMER', content: 'المقاس / العبوة متوفرة؟', hoursAgo: 0.5 },
        {
          role: 'AI',
          content: 'الكرياتين متوفر حالياً. تحب أجهّزلك طلب؟',
          hoursAgo: 0.4,
        },
      ],
    },
    {
      customer: customers[4],
      channel: 'INSTAGRAM',
      messages: [
        { role: 'CUSTOMER', content: 'عايزة أطلب قطعتين BCAA مانجو', hoursAgo: 3 },
        {
          role: 'AI',
          content: 'تمام! ابعتي الاسم والموبايل عشان نثبّت الأوردر.',
          hoursAgo: 2.8,
        },
      ],
    },
    {
      customer: customers[5],
      channel: 'FACEBOOK',
      messages: [
        { role: 'CUSTOMER', content: 'تم الدفع، متى الشحن؟', hoursAgo: 5 },
        {
          role: 'AI',
          content: 'الشحن خلال 24–48 ساعة داخل القاهرة 🚚',
          hoursAgo: 4.8,
        },
      ],
    },
    {
      customer: customers[6],
      channel: 'INSTAGRAM',
      messages: [
        { role: 'CUSTOMER', content: 'في توصيل للإسكندرية؟', hoursAgo: 8 },
        {
          role: 'AI',
          content: 'أيوه، بنوصل القاهرة والإسكندرية. التوصيل 50 ج.م.',
          hoursAgo: 7.9,
        },
      ],
    },
  ]

  for (const script of chatScripts) {
    const lastAt = new Date(Date.now() - script.messages[0].hoursAgo * 3600_000)
    const conv = await prisma.conversation.create({
      data: {
        businessId,
        customerId: script.customer.id,
        channel: script.channel,
        status: 'OPEN',
        lastMessageAt: lastAt,
        createdAt: daysAgo(2),
      },
    })
    for (const m of script.messages) {
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          role: m.role,
          content: m.content,
          createdAt: new Date(Date.now() - m.hoursAgo * 3600_000),
        },
      })
    }
  }

  const leadSpecs = [
    { customer: customers[1], status: 'NEW', intent: 'سأل عن السعر' },
    { customer: customers[2], status: 'QUALIFIED', intent: 'مهتم بالطلب' },
    { customer: customers[3], status: 'QUALIFIED', intent: 'توفر المنتج' },
    { customer: customers[4], status: 'NEW', intent: 'طلب قطعتين' },
    { customer: customers[6], status: 'NEW', intent: 'استفسار توصيل' },
    { customer: customers[0], status: 'CONVERTED', intent: 'طلب مؤكد' },
    { customer: customers[5], status: 'CONVERTED', intent: 'متابعة شحن' },
    { customer: customers[7], status: 'LOST', intent: 'سأل وماكمّلش' },
  ]
  for (const l of leadSpecs) {
    await prisma.lead.create({
      data: {
        businessId,
        customerId: l.customer.id,
        status: l.status,
        intent: l.intent,
        createdAt: daysAgo(Math.floor(Math.random() * 6)),
      },
    })
  }

  const orderPlan = [
    { day: 0, customer: customers[0], product: products[0], status: 'PENDING', size: '2كجم' },
    { day: 0, customer: customers[5], product: products[1], status: 'CONFIRMED', size: '300جم' },
    { day: 1, customer: customers[2], product: products[2], status: 'COMPLETED', size: '60 سيرف', color: 'مانجو', qty: 2 },
    { day: 2, customer: customers[1], product: products[3], status: 'COMPLETED', size: '90 قرص' },
    { day: 3, customer: customers[6], product: products[5], status: 'CONFIRMED', size: '60 كبسولة' },
    { day: 4, customer: customers[7], product: products[0], status: 'COMPLETED', size: '2كجم' },
    { day: 5, customer: customers[3], product: products[2], status: 'CANCELLED', size: '60 سيرف', color: 'توت' },
    { day: 6, customer: customers[4], product: products[1], status: 'COMPLETED', size: '300جم' },
    { day: 1, customer: customers[1], product: products[5], status: 'COMPLETED', size: '60 كبسولة' },
    { day: 2, customer: customers[0], product: products[3], status: 'CONFIRMED', size: '90 قرص', qty: 2 },
  ]

  let orderNumber = 1040
  for (const o of orderPlan) {
    const qty = o.qty ?? 1
    const total = o.product.priceEgp * qty
    const createdAt = daysAgo(o.day, 10 + (orderNumber % 8))
    const order = await prisma.order.create({
      data: {
        businessId,
        customerId: o.customer.id,
        orderNumber: orderNumber++,
        status: o.status,
        totalEgp: total,
        customerName: o.customer.name,
        customerPhone: o.customer.phone,
        createdAt,
        updatedAt: createdAt,
        items: {
          create: [
            {
              productId: o.product.id,
              name: o.product.name,
              size: o.size ?? null,
              color: o.color ?? null,
              quantity: qty,
              priceEgp: o.product.priceEgp,
            },
          ],
        },
      },
    })
    if (o.status === 'PENDING' || o.status === 'CONFIRMED') {
      await prisma.notification.create({
        data: {
          businessId,
          type: 'ORDER',
          title: `طلب جديد #${order.orderNumber}`,
          body: `${o.customer.name} · ${total.toLocaleString()} ج.م`,
          data: { orderId: order.id },
          readAt: o.status === 'CONFIRMED' ? new Date() : null,
          createdAt,
        },
      })
    }
  }

  await prisma.notification.createMany({
    data: [
      {
        businessId,
        type: 'LEAD',
        title: 'ليد جديد مهتم',
        body: 'عمر خالد بيسأل عن توفر الكرياتين',
        readAt: null,
        createdAt: daysAgo(0, 14),
      },
      {
        businessId,
        type: 'HANDOFF',
        title: 'تحويل لممثل',
        body: 'ليلى طلبت تتكلم مع حد من الفريق',
        readAt: null,
        createdAt: daysAgo(0, 11),
      },
      {
        businessId,
        type: 'AI_RECOMMENDATION',
        title: 'اقتراح من الوكيل',
        body: 'فعّل رد آلي عن التوصيل المجاني فوق 1500 ج.م',
        readAt: new Date(),
        createdAt: daysAgo(1, 9),
      },
    ],
  })

  const summary = {
    products: await prisma.product.count({ where: { businessId } }),
    customers: await prisma.customer.count({ where: { businessId } }),
    conversations: await prisma.conversation.count({ where: { businessId } }),
    leads: await prisma.lead.count({ where: { businessId } }),
    orders: await prisma.order.count({ where: { businessId } }),
    notifications: await prisma.notification.count({ where: { businessId } }),
  }
  console.log('Seeded demo for', EMAIL, summary)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
