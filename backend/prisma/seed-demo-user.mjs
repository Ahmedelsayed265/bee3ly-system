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

function variantSkuKey(options) {
  return Object.entries(options)
    .map(([k, v]) => [k.trim(), String(v).trim()])
    .filter(([k, v]) => k && v)
    .sort(([a], [b]) => a.localeCompare(b, 'ar'))
    .map(([k, v]) => `${k}=${v}`)
    .join('|')
}

/** Option catalogs. Extra values cover SKUs that are not in the base lists. */
const VARIANT_DICTIONARY = [
  {
    id: 'size',
    name: 'Size',
    values: [
      '250g',
      '300g',
      '500g',
      '1 KG',
      '2 KG',
      '3 KG',
      '5 KG',
      '6 KG',
      '600ml',
    ],
  },
  {
    id: 'flavor',
    name: 'Flavor',
    values: [
      'Chocolate',
      'Vanilla',
      'Strawberry',
      'Cookies & Cream',
      'Peanut Butter',
      'Fruit Punch',
      'Blue Raspberry',
      'Lemon',
      'Orange',
      'Unflavored',
    ],
  },
  {
    id: 'servings',
    name: 'Servings',
    values: [
      '20 Servings',
      '30 Servings',
      '60 Servings',
      '90 Servings',
      '120 Servings',
    ],
  },
  {
    id: 'capsules',
    name: 'Capsules',
    values: [
      '30 Capsules',
      '60 Capsules',
      '90 Capsules',
      '120 Capsules',
      '30 Capsules - 1000 IU',
      '60 Capsules - 5000 IU',
    ],
  },
  {
    id: 'tablets',
    name: 'Tablets',
    values: ['30 Tablets', '60 Tablets'],
  },
  {
    id: 'form',
    name: 'Form',
    values: ['Powder', 'Capsules', 'Tablets', 'Softgels', 'Sachets', 'Bars'],
  },
  {
    id: 'color',
    name: 'Color',
    values: ['Black', 'White', 'Transparent', 'Red', 'Blue'],
  },
  {
    id: 'pack_size',
    name: 'Pack size',
    values: ['Single', 'Pack of 6', 'Pack of 12', 'Pack of 24', 'Pair', '20 Sachets'],
  },
]

const DEMO_STOCK = 20

function catalogProduct(spec) {
  const axisNames = [...new Set(spec.skus.flatMap((sku) => Object.keys(sku.options)))]
  const axes = axisNames.map((name) => ({
    name,
    values: [
      ...new Set(spec.skus.map((sku) => sku.options[name]).filter(Boolean)),
    ],
  }))
  const skus = spec.skus.map((sku) => ({
    key: variantSkuKey(sku.options),
    options: sku.options,
    priceEgp: sku.priceEgp,
    costEgp: sku.costEgp,
    stockQuantity: DEMO_STOCK,
  }))
  return {
    name: spec.name,
    description: spec.category,
    priceEgp: Math.min(...skus.map((sku) => sku.priceEgp)),
    costEgp: Math.min(...skus.map((sku) => sku.costEgp)),
    attributes: { category: spec.category },
    variants: { axes, skus },
    stockQuantity: skus.reduce((sum, sku) => sum + sku.stockQuantity, 0),
    inStock: true,
  }
}

const CATALOG = [
  catalogProduct({
    name: 'Whey Protein',
    category: 'Protein',
    skus: [
      { options: { Size: '1 KG', Flavor: 'Chocolate' }, costEgp: 1650, priceEgp: 2150 },
      { options: { Size: '1 KG', Flavor: 'Vanilla' }, costEgp: 1650, priceEgp: 2150 },
      { options: { Size: '2 KG', Flavor: 'Chocolate' }, costEgp: 3000, priceEgp: 3850 },
      { options: { Size: '2 KG', Flavor: 'Vanilla' }, costEgp: 3000, priceEgp: 3850 },
    ],
  }),
  catalogProduct({
    name: 'Creatine Monohydrate',
    category: 'Creatine',
    skus: [
      { options: { Size: '300g', Flavor: 'Unflavored' }, costEgp: 650, priceEgp: 900 },
      { options: { Size: '500g', Flavor: 'Unflavored' }, costEgp: 950, priceEgp: 1300 },
    ],
  }),
  catalogProduct({
    name: 'BCAA',
    category: 'Amino Acids',
    skus: [
      { options: { Servings: '30 Servings', Flavor: 'Lemon' }, costEgp: 600, priceEgp: 850 },
      { options: { Servings: '30 Servings', Flavor: 'Orange' }, costEgp: 600, priceEgp: 850 },
    ],
  }),
  catalogProduct({
    name: 'Pre Workout',
    category: 'Pre Workout',
    skus: [
      { options: { Servings: '30 Servings', Flavor: 'Fruit Punch' }, costEgp: 750, priceEgp: 1050 },
      { options: { Servings: '30 Servings', Flavor: 'Blue Raspberry' }, costEgp: 750, priceEgp: 1050 },
    ],
  }),
  catalogProduct({
    name: 'Mass Gainer',
    category: 'Weight Gain',
    skus: [
      { options: { Size: '3 KG', Flavor: 'Chocolate' }, costEgp: 1800, priceEgp: 2400 },
      { options: { Size: '3 KG', Flavor: 'Vanilla' }, costEgp: 1800, priceEgp: 2400 },
      { options: { Size: '6 KG', Flavor: 'Chocolate' }, costEgp: 3200, priceEgp: 4200 },
    ],
  }),
  catalogProduct({
    name: 'Omega 3',
    category: 'Vitamins',
    skus: [
      { options: { Capsules: '60 Capsules' }, costEgp: 280, priceEgp: 400 },
      { options: { Capsules: '120 Capsules' }, costEgp: 500, priceEgp: 700 },
    ],
  }),
  catalogProduct({
    name: 'Multivitamin',
    category: 'Vitamins',
    skus: [
      { options: { Tablets: '30 Tablets' }, costEgp: 250, priceEgp: 375 },
      { options: { Tablets: '60 Tablets' }, costEgp: 430, priceEgp: 600 },
    ],
  }),
  catalogProduct({
    name: 'Vitamin D3',
    category: 'Vitamins',
    skus: [
      { options: { Capsules: '30 Capsules - 1000 IU' }, costEgp: 120, priceEgp: 180 },
      { options: { Capsules: '60 Capsules - 5000 IU' }, costEgp: 220, priceEgp: 320 },
    ],
  }),
  catalogProduct({
    name: 'Magnesium',
    category: 'Minerals',
    skus: [{ options: { Tablets: '60 Tablets' }, costEgp: 280, priceEgp: 400 }],
  }),
  catalogProduct({
    name: 'Zinc',
    category: 'Minerals',
    skus: [{ options: { Tablets: '60 Tablets' }, costEgp: 180, priceEgp: 275 }],
  }),
  catalogProduct({
    name: 'Electrolytes',
    category: 'Hydration',
    skus: [
      { options: { 'Pack size': '20 Sachets', Flavor: 'Lemon' }, costEgp: 300, priceEgp: 450 },
      { options: { 'Pack size': '20 Sachets', Flavor: 'Orange' }, costEgp: 300, priceEgp: 450 },
    ],
  }),
  catalogProduct({
    name: 'Glutamine',
    category: 'Amino Acids',
    skus: [
      { options: { Size: '300g', Flavor: 'Unflavored' }, costEgp: 550, priceEgp: 800 },
    ],
  }),
  catalogProduct({
    name: 'Collagen',
    category: 'Beauty & Wellness',
    skus: [
      { options: { Size: '300g', Flavor: 'Unflavored' }, costEgp: 700, priceEgp: 950 },
    ],
  }),
  catalogProduct({
    name: 'Protein Bar',
    category: 'Snacks',
    skus: [
      { options: { 'Pack size': 'Pack of 12', Flavor: 'Chocolate' }, costEgp: 450, priceEgp: 650 },
      { options: { 'Pack size': 'Pack of 12', Flavor: 'Peanut Butter' }, costEgp: 450, priceEgp: 650 },
    ],
  }),
  catalogProduct({
    name: 'Shaker Bottle',
    category: 'Accessories',
    skus: [
      { options: { Size: '600ml', Color: 'Black' }, costEgp: 120, priceEgp: 200 },
      { options: { Size: '600ml', Color: 'Transparent' }, costEgp: 120, priceEgp: 200 },
    ],
  }),
  catalogProduct({
    name: 'Lifting Straps',
    category: 'Accessories',
    skus: [{ options: { 'Pack size': 'Pair', Color: 'Black' }, costEgp: 150, priceEgp: 250 }],
  }),
]

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
      variantDictionary: VARIANT_DICTIONARY,
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

  const products = []
  for (const item of CATALOG) {
    products.push(
      await prisma.product.create({ data: { businessId, ...item } }),
    )
  }
  const productByName = Object.fromEntries(products.map((p) => [p.name, p]))

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
      product: productByName['Whey Protein'],
      status: 'PENDING',
      size: '2 KG',
      color: 'Chocolate',
      unitPrice: 3850,
      unitCost: 3000,
      governorate: 'cairo',
      address: 'شارع 9، المعادي، برج 12، الدور 3',
      payment: 'إنستاباي',
    },
    {
      day: 0,
      customer: customers[5],
      campaign: campWhey,
      product: productByName['Creatine Monohydrate'],
      status: 'CONFIRMED',
      size: '300g',
      color: 'Unflavored',
      unitPrice: 900,
      unitCost: 650,
      governorate: 'giza',
      address: '6 أكتوبر، الحي السابع، فيلا 8',
      payment: 'كاش عند الاستلام',
    },
    {
      day: 1,
      customer: customers[2],
      campaign: campWhey,
      product: productByName['BCAA'],
      status: 'COMPLETED',
      size: '30 Servings',
      color: 'Lemon',
      unitPrice: 850,
      unitCost: 600,
      qty: 2,
      governorate: 'alexandria',
      address: 'سموحة، شارع فوزي معاذ، عمارة 15',
      payment: 'كاش عند الاستلام',
    },
    {
      day: 2,
      customer: customers[1],
      campaign: campLeads,
      product: productByName['Multivitamin'],
      status: 'COMPLETED',
      size: '60 Tablets',
      unitPrice: 600,
      unitCost: 430,
      governorate: 'sharqia',
      address: 'الزقازيق، شارع الجلاء',
      payment: 'كاش عند الاستلام',
    },
    {
      day: 3,
      customer: customers[6],
      campaign: campLeads,
      product: productByName['Omega 3'],
      status: 'CONFIRMED',
      size: '60 Capsules',
      unitPrice: 400,
      unitCost: 280,
      governorate: 'cairo',
      address: 'مدينة نصر، عباس العقاد',
      payment: 'Instapay',
    },
    {
      day: 4,
      customer: customers[7],
      campaign: null,
      product: productByName['Whey Protein'],
      status: 'COMPLETED',
      size: '2 KG',
      color: 'Chocolate',
      unitPrice: 3850,
      unitCost: 3000,
      governorate: 'qalyubia',
      address: 'شبرا الخيمة، شارع مسجد الفتح',
      payment: 'كاش عند الاستلام',
    },
    {
      day: 5,
      customer: customers[3],
      campaign: campRetarget,
      product: productByName['BCAA'],
      status: 'CANCELLED',
      size: '30 Servings',
      color: 'Orange',
      unitPrice: 850,
      unitCost: 600,
      governorate: 'cairo',
      address: 'التجمع الخامس، بوابة 3',
    },
    {
      day: 6,
      customer: customers[4],
      campaign: campRetarget,
      product: productByName['Creatine Monohydrate'],
      status: 'COMPLETED',
      size: '300g',
      color: 'Unflavored',
      unitPrice: 900,
      unitCost: 650,
      governorate: 'ismailia',
      address: 'الإسماعيلية، شارع صلاح سالم',
      payment: 'كاش عند الاستلام',
    },
    {
      day: 1,
      customer: customers[1],
      campaign: campLeads,
      product: productByName['Omega 3'],
      status: 'COMPLETED',
      size: '60 Capsules',
      unitPrice: 400,
      unitCost: 280,
      governorate: 'cairo',
      address: 'مصر الجديدة، شارع الخمسين',
      payment: 'فودافون كاش',
    },
    {
      day: 2,
      customer: customers[0],
      campaign: campWhey,
      product: productByName['Multivitamin'],
      status: 'CONFIRMED',
      size: '30 Tablets',
      unitPrice: 375,
      unitCost: 250,
      qty: 2,
      governorate: 'giza',
      address: 'الدقي، شارع التحرير، الدور 5',
      payment: 'فودافون كاش',
    },
  ]

  let orderNumber = 1040
  for (const o of orderPlan) {
    const qty = o.qty ?? 1
    const unitPrice = o.unitPrice ?? o.product.priceEgp
    const total = unitPrice * qty
    const governorate = o.governorate ?? 'cairo'
    const shippingEgp =
      o.status === 'CANCELLED' ? null : shippingFor(governorate)
    const costEgp = o.unitCost ?? o.product.costEgp ?? defaultCost(unitPrice)
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
              priceEgp: unitPrice,
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
