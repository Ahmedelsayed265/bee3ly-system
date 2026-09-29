/**
 * Demo seed for ahmedelsayed2102@icloud.com — full vertical slice:
 * campaigns ↔ conversations / leads / orders, products, inbox, notifications.
 * Run: npm run db:seed:demo  (from backend/)
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const EMAIL = 'ahmedelsayed2102@icloud.com'
const prisma = new PrismaClient()

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

const DEMO_RECEIPT_IMAGE =
  'https://images.unsplash.com/photo-1563013547-7f1c26502fd4?w=480&h=640&fit=crop'

function shippingFor(governorate) {
  const zone = DEFAULT_SHIPPING_ZONES.find((item) =>
    item.governorates.includes(governorate),
  )
  return zone?.priceEgp ?? 65
}

function defaultCost(priceEgp) {
  return Math.max(0, Math.round(priceEgp * 0.48))
}

function daysAgo(n, hour = 12) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, 15 + (n % 8), 0, 0)
  return d
}

function daysFromNow(n, hour = 12) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(hour, 0, 0, 0)
  return d
}

function hoursAgo(n) {
  return new Date(Date.now() - n * 3600_000)
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
      name: 'Hillix Pharm',
      type: 'ECOMMERCE',
      plan: 'GROWTH',
      description:
        'مكملات غذائية وبروتين للرياضيين — استيراد رسمي · توصيل لكل المحافظات',
      averagePriceEgp: 850,
      operatingArea: 'مصر — القاهرة · الدلتا · الصعيد',
      contactChannels: ['FACEBOOK', 'INSTAGRAM'],
      primaryGoal: 'INCREASE_SALES',
      deliveryInfo:
        'توصيل 24–48 ساعة · شحن حسب المنطقة من إعدادات التوصيل · مجاني فوق 2000 ج.م',
      workingHours: 'السبت–الخميس 10 ص – 11 م',
      paymentInfo:
        'كاش عند الاستلام · فودافون كاش 010010111213 · إنستاباي 010010111213',
      faqs:
        'هل المنتج أصلي؟ نعم، استيراد رسمي.\nممكن أرجع؟ خلال 14 يوم بشرط عدم الفتح.\nالشحن للمنوفية؟ أيوه، حسب منطقة الشحن.',
      onboardingCompletedAt: new Date(),
      shippingZones: DEFAULT_SHIPPING_ZONES,
    },
  })

  await prisma.aIAgent.upsert({
    where: { businessId },
    create: {
      businessId,
      primaryGoal: 'GET_ORDERS',
      secondaryGoals: ['ANSWER_QUESTIONS', 'QUALIFY', 'HUMAN_HANDOFF'],
      tone: 'FRIENDLY_PROFESSIONAL',
      instructions:
        'ركّز على واي بروتين والكرياتين. اذكر الشحن من مناطق التوصيل. لا تخمّن المخزون.',
      handoffEnabled: true,
      isActive: true,
    },
    update: {
      primaryGoal: 'GET_ORDERS',
      tone: 'FRIENDLY_PROFESSIONAL',
      handoffEnabled: true,
      isActive: true,
      instructions:
        'ركّز على واي بروتين والكرياتين. اذكر الشحن من مناطق التوصيل. لا تخمّن المخزون.',
    },
  })

  // Wipe demo domain (keep user / business / agent)
  await prisma.orderItem.deleteMany({
    where: { order: { businessId } },
  })
  await prisma.order.deleteMany({ where: { businessId } })
  await prisma.pageComment.deleteMany({ where: { businessId } })
  await prisma.lead.deleteMany({ where: { businessId } })
  await prisma.message.deleteMany({
    where: { conversation: { businessId } },
  })
  await prisma.conversation.deleteMany({ where: { businessId } })
  await prisma.notification.deleteMany({ where: { businessId } })
  await prisma.campaign.deleteMany({ where: { businessId } })
  await prisma.product.deleteMany({ where: { businessId } })
  await prisma.customer.deleteMany({ where: { businessId } })
  await prisma.socialAccount.deleteMany({ where: { businessId } })

  await prisma.socialAccount.createMany({
    data: [
      {
        businessId,
        platform: 'FACEBOOK',
        externalId: 'demo-fb-hillix',
        displayName: 'Hillix Pharm · Facebook',
        accessTokenEnc: 'demo',
        status: 'SIMULATION',
      },
      {
        businessId,
        platform: 'INSTAGRAM',
        externalId: 'demo-ig-hillix',
        displayName: 'Hillix Pharm · Instagram',
        accessTokenEnc: 'demo',
        status: 'SIMULATION',
      },
    ],
  })

  const [campWhey, campLeads, campRetarget, campDraft] = await Promise.all([
    prisma.campaign.create({
      data: {
        businessId,
        name: 'واي بروتين 2كجم — إنستجرام',
        objective: 'MORE_ORDERS',
        status: 'ACTIVE',
        offer: 'واي بروتين شوكولاتة 2كجم — شحن مخفّض داخل القاهرة الكبرى',
        audienceDescription: 'INTERESTED',
        budget: 4200,
        currency: 'EGP',
        valueProposition: '26g بروتين للسكoop · استيراد رسمي',
        suggestedMessaging:
          'عايز تكبير؟ واي بروتين Hillix ب1850 ج.م — اطلب من DM',
        suggestedCta: 'اطلب الآن',
        suggestedCreative: 'صورة العبوة + قبل/بعد تمرين',
        channel: 'INSTAGRAM',
        startDate: daysAgo(18),
        endDate: daysFromNow(12),
        createdAt: daysAgo(20),
      },
    }),
    prisma.campaign.create({
      data: {
        businessId,
        name: 'كرياتين + BCAA — فيسبوك',
        objective: 'MORE_LEADS',
        status: 'ACTIVE',
        offer: 'استفسار عن الكرياتين أو BCAA — رد AI فوري',
        audienceDescription: 'ENGAGED',
        budget: 2800,
        currency: 'EGP',
        valueProposition: 'تأهيل العملاء قبل الطلب',
        suggestedMessaging: 'اسأل عن جرعة الكرياتين المناسبة ليك',
        suggestedCta: 'ابعت رسالة',
        channel: 'FACEBOOK',
        startDate: daysAgo(10),
        endDate: daysFromNow(20),
        createdAt: daysAgo(11),
      },
    }),
    prisma.campaign.create({
      data: {
        businessId,
        name: 'إعادة استهداف BCAA',
        objective: 'RETARGETING',
        status: 'PAUSED',
        offer: 'BCAA مانجو — خصم 10% للي فتحوا المحادثة',
        audienceDescription: 'MESSAGED',
        budget: 1500,
        currency: 'EGP',
        channel: 'INSTAGRAM',
        startDate: daysAgo(45),
        endDate: daysAgo(5),
        createdAt: daysAgo(46),
      },
    }),
    prisma.campaign.create({
      data: {
        businessId,
        name: 'أوميغا 3 — مسودة مارس',
        objective: 'AWARENESS',
        status: 'READY',
        offer: 'أوميغا 3 فيش أويل — الوعي بالبراند',
        audienceDescription: 'NEARBY',
        budget: 2000,
        currency: 'EGP',
        suggestedCta: 'اعرف أكتر',
        channel: 'FACEBOOK',
        createdAt: daysAgo(2),
      },
    }),
  ])

  const products = await Promise.all(
    [
      {
        name: 'واي بروتين شوكولاتة 2كجم',
        description: '26g بروتين لكل سكoop',
        priceEgp: 1850,
        costEgp: 980,
        attributes: { sizes: ['2كجم'], flavors: ['شوكولاتة'], protein_g: 26 },
        stockQuantity: 40,
        inStock: true,
      },
      {
        name: 'كرياتين مونوهيدرات 300جم',
        description: '5g يوميًا',
        priceEgp: 450,
        costEgp: 220,
        attributes: { sizes: ['300جم'], serving: '5g' },
        stockQuantity: 80,
        inStock: true,
      },
      {
        name: 'BCAA أمينو 60 سيرف',
        priceEgp: 620,
        costEgp: 310,
        attributes: { sizes: ['60 سيرف'], flavors: ['مانجو', 'توت'] },
        stockQuantity: 35,
        inStock: true,
      },
      {
        name: 'مالتي فيتامين يومي',
        priceEgp: 280,
        costEgp: 120,
        attributes: { sizes: ['90 قرص'] },
        stockQuantity: 50,
        inStock: true,
      },
      {
        name: 'بري ورك آوت',
        priceEgp: 750,
        costEgp: 380,
        attributes: { sizes: ['30 سيرف'], flavors: ['تفاح أخضر'] },
        stockQuantity: 0,
        inStock: false,
      },
      {
        name: 'أوميغا 3 فيش أويل',
        priceEgp: 390,
        costEgp: 175,
        attributes: { sizes: ['60 كبسولة'] },
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
    {
      name: 'احمد السيد محمد عبد المحسن',
      phone: '01027964469',
      platform: 'INSTAGRAM',
    },
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

  const paymentReviewCustomer = customers[8]

  const chatScripts = [
    {
      customer: customers[0],
      campaign: campWhey,
      channel: 'INSTAGRAM',
      conversionStage: 'CONVERTED',
      messages: [
        { role: 'CUSTOMER', content: 'الواي بروتين بكام؟', hoursAgo: 26 },
        {
          role: 'AI',
          content: 'واي بروتين شوكولاتة 2كجم بـ 1,850 ج.م + الشحن حسب المحافظة 💪',
          hoursAgo: 25.8,
        },
        {
          role: 'CUSTOMER',
          content: 'تمام — سارة أحمد · 01012345678 · المعادي',
          hoursAgo: 25,
        },
        {
          role: 'AI',
          content: 'تم تسجيل الطلب ✅ هيتأكد من الفريق.',
          hoursAgo: 24.8,
        },
      ],
    },
    {
      customer: customers[3],
      campaign: campLeads,
      channel: 'FACEBOOK',
      conversionStage: 'CONSIDERATION',
      messages: [
        { role: 'CUSTOMER', content: 'الكرياتين 300جم متوفر؟', hoursAgo: 4 },
        {
          role: 'AI',
          content: 'أيوه متوفر. 450 ج.م — تحب أجهّزلك طلب؟',
          hoursAgo: 3.8,
        },
      ],
    },
    {
      customer: customers[4],
      campaign: campRetarget,
      channel: 'INSTAGRAM',
      conversionStage: 'PURCHASE_INTENT',
      messages: [
        { role: 'CUSTOMER', content: 'عايزة قطعتين BCAA مانجو', hoursAgo: 8 },
        {
          role: 'AI',
          content: 'تمام! ابعتي الاسم والموبايل والمحافظة.',
          hoursAgo: 7.7,
        },
      ],
    },
    {
      customer: customers[5],
      campaign: campWhey,
      channel: 'FACEBOOK',
      conversionStage: 'CONVERTED',
      messages: [
        { role: 'CUSTOMER', content: 'تم الدفع، متى الشحن؟', hoursAgo: 48 },
        {
          role: 'AI',
          content: 'الشحن خلال 24–48 ساعة 🚚',
          hoursAgo: 47.5,
        },
      ],
    },
    {
      customer: customers[6],
      campaign: campLeads,
      channel: 'INSTAGRAM',
      conversionStage: 'QUALIFICATION',
      messages: [
        { role: 'CUSTOMER', content: 'في توصيل للإسكندرية؟', hoursAgo: 12 },
        {
          role: 'AI',
          content: 'أيوه — منطقة الإسكندرية والدلتا 65 ج.م.',
          hoursAgo: 11.8,
        },
      ],
    },
    {
      customer: paymentReviewCustomer,
      campaign: campWhey,
      channel: 'INSTAGRAM',
      conversionStage: 'DATA_COLLECTION',
      needsHuman: true,
      handoffReason: 'PAYMENT_REVIEW',
      mode: 'AI',
      messages: [
        { role: 'CUSTOMER', content: 'السلام عليكم، عايز واي بروتين 2كجم', hoursAgo: 3 },
        {
          role: 'AI',
          content: 'وعليكم السلام! 1850 ج.م — تحبي كاش ولا إنستاباي؟',
          hoursAgo: 2.9,
        },
        { role: 'CUSTOMER', content: 'هدفع انستا باي', hoursAgo: 2.2 },
        {
          role: 'AI',
          content:
            'حلو! حوّلي 1915 ج.م (مع الشحن) على 010010111213 وابعتي صورة التحويل.',
          hoursAgo: 2.1,
        },
        {
          role: 'CUSTOMER',
          content:
            '[IMAGE_ATTACHMENT: customer sent an image — treat as transfer/payment screenshot if checkout asked for one; use transferToHuman PAYMENT_REVIEW when prepaid flow applies]',
          hoursAgo: 1.5,
          meta: {
            paymentReceipt: true,
            attachments: [{ type: 'image', url: DEMO_RECEIPT_IMAGE }],
          },
        },
        {
          role: 'AI',
          content:
            'تم استلام الإيصال ✅ سيتم مراجعته وإنشاء الطلب بعد تأكيد صاحب المتجر للتحويل.',
          hoursAgo: 1.4,
        },
      ],
    },
  ]

  const convByCustomer = new Map()
  for (const script of chatScripts) {
    const lastAt = hoursAgo(script.messages[0].hoursAgo)
    const conv = await prisma.conversation.create({
      data: {
        businessId,
        customerId: script.customer.id,
        campaignId: script.campaign.id,
        channel: script.channel,
        status: script.needsHuman ? 'NEEDS_HUMAN' : 'OPEN',
        mode: script.mode ?? 'AI',
        conversionStage: script.conversionStage ?? 'NEW',
        needsHuman: script.needsHuman ?? false,
        handoffReason: script.handoffReason ?? null,
        aiSummary: script.handoffReason
          ? 'Customer sent transfer screenshot — awaiting merchant verification'
          : null,
        lastMessageAt: lastAt,
        createdAt: daysAgo(3),
      },
    })
    convByCustomer.set(script.customer.id, conv)
    for (const m of script.messages) {
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          role: m.role,
          content: m.content,
          meta: m.meta ?? undefined,
          createdAt: hoursAgo(m.hoursAgo),
        },
      })
    }
  }

  const leadSpecs = [
    {
      customer: customers[1],
      campaign: campLeads,
      status: 'NEW',
      intent: 'سأل عن السعر',
    },
    {
      customer: customers[2],
      campaign: campLeads,
      status: 'QUALIFIED',
      intent: 'مهتم بالطلب',
    },
    {
      customer: customers[3],
      campaign: campLeads,
      status: 'QUALIFIED',
      intent: 'توفر الكرياتين',
    },
    {
      customer: customers[4],
      campaign: campRetarget,
      status: 'NEW',
      intent: 'طلب قطعتين BCAA',
    },
    {
      customer: customers[6],
      campaign: campLeads,
      status: 'NEW',
      intent: 'استفسار توصيل',
    },
    {
      customer: customers[0],
      campaign: campWhey,
      status: 'CONVERTED',
      intent: 'طلب واي بروتين',
    },
    {
      customer: customers[5],
      campaign: campWhey,
      status: 'CONVERTED',
      intent: 'متابعة شحن',
    },
    {
      customer: customers[7],
      campaign: null,
      status: 'LOST',
      intent: 'سأل وماكمّلش',
    },
  ]
  for (const l of leadSpecs) {
    const conv = convByCustomer.get(l.customer.id)
    await prisma.lead.create({
      data: {
        businessId,
        customerId: l.customer.id,
        campaignId: l.campaign?.id ?? null,
        conversationId: conv?.id ?? null,
        status: l.status,
        intent: l.intent,
        createdAt: daysAgo(Math.floor(Math.random() * 8) + 1),
      },
    })
  }

  const orderPlan = [
    {
      day: 0,
      customer: customers[0],
      campaign: campWhey,
      product: products[0],
      status: 'PENDING',
      size: '2كجم',
      governorate: 'cairo',
      address: 'شارع 9، المعادي، برج 12، الدور 3',
      payment: 'إنستاباي',
    },
    {
      day: 0,
      customer: customers[5],
      campaign: campWhey,
      product: products[1],
      status: 'CONFIRMED',
      size: '300جم',
      governorate: 'giza',
      address: '6 أكتوبر، الحي السابع، فيلا 8',
      payment: 'كاش عند الاستلام',
    },
    {
      day: 1,
      customer: customers[2],
      campaign: campWhey,
      product: products[2],
      status: 'COMPLETED',
      size: '60 سيرف',
      color: 'مانجو',
      qty: 2,
      governorate: 'alexandria',
      address: 'سموحة، شارع فوزي معاذ، عمارة 15',
      payment: 'كاش عند الاستلام',
    },
    {
      day: 2,
      customer: customers[1],
      campaign: campLeads,
      product: products[3],
      status: 'COMPLETED',
      size: '90 قرص',
      governorate: 'sharqia',
      address: 'الزقازيق، شارع الجلاء',
      payment: 'كاش عند الاستلام',
    },
    {
      day: 3,
      customer: customers[6],
      campaign: campLeads,
      product: products[5],
      status: 'CONFIRMED',
      size: '60 كبسولة',
      governorate: 'cairo',
      address: 'مدينة نصر، عباس العقاد',
      payment: 'Instapay',
    },
    {
      day: 4,
      customer: customers[7],
      campaign: null,
      product: products[0],
      status: 'COMPLETED',
      size: '2كجم',
      governorate: 'qalyubia',
      address: 'شبرا الخيمة، شارع مسجد الفتح',
      payment: 'كاش عند الاستلام',
    },
    {
      day: 5,
      customer: customers[3],
      campaign: campRetarget,
      product: products[2],
      status: 'CANCELLED',
      size: '60 سيرف',
      color: 'توت',
      governorate: 'cairo',
      address: 'التجمع الخامس، بوابة 3',
    },
    {
      day: 6,
      customer: customers[4],
      campaign: campRetarget,
      product: products[1],
      status: 'COMPLETED',
      size: '300جم',
      governorate: 'ismailia',
      address: 'الإسماعيلية، شارع صلاح سالم',
      payment: 'كاش عند الاستلام',
    },
    {
      day: 1,
      customer: customers[1],
      campaign: campLeads,
      product: products[5],
      status: 'COMPLETED',
      size: '60 كبسولة',
      governorate: 'cairo',
      address: 'مصر الجديدة، شارع الخمسين',
      payment: 'فودافون كاش',
    },
    {
      day: 2,
      customer: customers[0],
      campaign: campWhey,
      product: products[3],
      status: 'CONFIRMED',
      size: '90 قرص',
      qty: 2,
      governorate: 'giza',
      address: 'الدقي، شارع التحرير، الدور 5',
      payment: 'فودافون كاش',
    },
  ]

  let orderNumber = 1040
  for (const o of orderPlan) {
    const qty = o.qty ?? 1
    const total = o.product.priceEgp * qty
    const governorate = o.governorate ?? 'cairo'
    const shippingEgp =
      o.status === 'CANCELLED' ? null : shippingFor(governorate)
    const costEgp = o.product.costEgp ?? defaultCost(o.product.priceEgp)
    const createdAt = daysAgo(o.day, 10 + (orderNumber % 8))
    const noteParts = []
    if (o.address && o.status !== 'CANCELLED') {
      noteParts.push(`العنوان: ${o.address}`)
    }
    if (o.payment && o.status !== 'CANCELLED') {
      noteParts.push(`الدفع: ${o.payment}`)
    }
    const conv = convByCustomer.get(o.customer.id)
    const order = await prisma.order.create({
      data: {
        businessId,
        customerId: o.customer.id,
        conversationId: conv?.id ?? null,
        campaignId: o.campaign?.id ?? null,
        orderNumber: orderNumber++,
        status: o.status,
        totalEgp: total,
        customerName: o.customer.name,
        customerPhone: o.customer.phone,
        governorate: o.status === 'CANCELLED' ? null : governorate,
        shippingEgp,
        notes: noteParts.length ? noteParts.join(' | ') : null,
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
              costEgp: o.status === 'CANCELLED' ? null : costEgp,
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
          data: { orderId: order.id, campaignId: o.campaign?.id ?? null },
          readAt: o.status === 'CONFIRMED' ? new Date() : null,
          createdAt,
        },
      })
    }
  }

  const paymentConv = convByCustomer.get(paymentReviewCustomer.id)
  await prisma.notification.create({
    data: {
      businessId,
      type: 'ORDER',
      title: 'إيصال يحتاج تأكيد',
      body: `${paymentReviewCustomer.name} — تم استلام إيصال تحويل`,
      data: {
        conversationId: paymentConv?.id,
        kind: 'PAYMENT_RECEIPT',
        campaignId: campWhey.id,
      },
      readAt: null,
      createdAt: hoursAgo(1.4),
    },
  })

  await prisma.notification.createMany({
    data: [
      {
        businessId,
        type: 'LEAD',
        title: 'ليد من حملة فيسبوك',
        body: 'محمد علي — سأل عن السعر (كرياتين + BCAA)',
        data: { campaignId: campLeads.id },
        readAt: null,
        createdAt: daysAgo(0, 14),
      },
      {
        businessId,
        type: 'CAMPAIGN',
        title: 'حملة نشطة',
        body: `«${campWhey.name}» — ${4200} ج.م ميزانية`,
        data: { campaignId: campWhey.id },
        readAt: new Date(),
        createdAt: daysAgo(1, 9),
      },
      {
        businessId,
        type: 'AI_RECOMMENDATION',
        title: 'اقتراح من الوكيل',
        body: 'فعّل رد آلي عن الشحن المجاني فوق 2000 ج.م في حملة الوي',
        data: { campaignId: campWhey.id },
        readAt: new Date(),
        createdAt: daysAgo(2, 9),
      },
    ],
  })

  const summary = {
    campaigns: await prisma.campaign.count({ where: { businessId } }),
    products: await prisma.product.count({ where: { businessId } }),
    customers: await prisma.customer.count({ where: { businessId } }),
    conversations: await prisma.conversation.count({ where: { businessId } }),
    leads: await prisma.lead.count({ where: { businessId } }),
    orders: await prisma.order.count({ where: { businessId } }),
    notifications: await prisma.notification.count({ where: { businessId } }),
  }
  console.log('Seeded demo for', EMAIL, summary)
  console.log('Campaigns:', {
    whey: campWhey.id,
    leads: campLeads.id,
    retarget: campRetarget.id,
    draft: campDraft.id,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
