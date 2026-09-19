import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LeadStatus,
  MessageRole,
  NotificationType,
  type Product,
} from '@prisma/client';
import { BusinessAccessService } from '../common/business-access.service';
import { ConversationsService } from '../conversations/conversations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

type ToolName =
  | 'getProduct'
  | 'checkStock'
  | 'getDeliveryInfo'
  | 'createOrder'
  | 'transferToHuman'
  | 'notifyOwner';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
    private readonly conversations: ConversationsService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  async getAgent(userId: string) {
    const businessId = await this.access.requireBusinessId(userId);
    let agent = await this.prisma.aIAgent.findUnique({ where: { businessId } });
    if (!agent) {
      agent = await this.prisma.aIAgent.create({
        data: { businessId },
      });
    }
    return { agent };
  }

  async updateAgent(
    userId: string,
    input: { primaryGoal?: string; secondaryGoals?: string[]; isActive?: boolean },
  ) {
    const businessId = await this.access.requireBusinessId(userId);
    const agent = await this.prisma.aIAgent.upsert({
      where: { businessId },
      create: {
        businessId,
        primaryGoal: input.primaryGoal ?? 'GET_ORDERS',
        secondaryGoals: input.secondaryGoals ?? [
          'ANSWER_QUESTIONS',
          'QUALIFY',
          'HUMAN_HANDOFF',
        ],
        isActive: input.isActive ?? true,
      },
      update: {
        ...(input.primaryGoal !== undefined
          ? { primaryGoal: input.primaryGoal }
          : {}),
        ...(input.secondaryGoals !== undefined
          ? { secondaryGoals: input.secondaryGoals }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    return { agent };
  }

  async simulateMessage(userId: string, content: string, conversationId?: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const conversation = conversationId
      ? await this.prisma.conversation.findFirst({
          where: { id: conversationId, businessId },
          include: {
            customer: true,
            messages: { orderBy: { createdAt: 'asc' } },
          },
        })
      : await this.conversations.ensureSimulationConversation(businessId);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const intent = this.detectIntent(content);
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MessageRole.CUSTOMER,
        content,
        intent,
      },
    });

    const products = await this.prisma.product.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' },
    });
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    });

    const history = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });

    const result = await this.runEngine({
      businessId,
      conversationId: conversation.id,
      customerId: conversation.customerId,
      content,
      intent,
      products,
      deliveryInfo: business.deliveryInfo,
      workingHours: business.workingHours,
      paymentInfo: business.paymentInfo,
      faqs: business.faqs,
      history: history.map((m) => ({ role: m.role, content: m.content })),
    });

    const aiMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MessageRole.AI,
        content: result.reply,
        intent: result.intent,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        needsHuman: result.needsHuman,
        status: result.needsHuman ? 'NEEDS_HUMAN' : 'OPEN',
      },
    });

    if (
      intent === 'PURCHASE_INTENT' ||
      intent === 'PRICE_INQUIRY' ||
      intent === 'AVAILABILITY'
    ) {
      await this.prisma.lead.create({
        data: {
          businessId,
          customerId: conversation.customerId,
          conversationId: conversation.id,
          status: LeadStatus.NEW,
          intent,
        },
      });
    }

    const llmMode = this.config.get('OPENAI_API_KEY') ? 'llm' : 'rules';
    this.logger.debug(`AI reply via ${llmMode}`);

    return {
      conversationId: conversation.id,
      intent: result.intent,
      reply: result.reply,
      toolsUsed: result.toolsUsed,
      order: result.order,
      message: aiMessage,
      mode: llmMode,
    };
  }

  private detectIntent(content: string): string {
    const text = content.toLowerCase();
    if (/عايز أكلم|كلم حد|موظف|human|agent/.test(text)) return 'HUMAN_REQUEST';
    if (/عايز أطلب|اطلب|هطلب|purchase|order|اشتري/.test(text))
      return 'PURCHASE_INTENT';
    if (/سعر|كام|بكام|price|تكلفة/.test(text)) return 'PRICE_INQUIRY';
    if (/متوفر|موجود|مخزون|مقاس|size|xl|l\b|m\b|availability/.test(text))
      return 'AVAILABILITY';
    if (/توصيل|delivery|شحن/.test(text)) return 'DELIVERY_QUESTION';
    if (/شكوى|مشكلة|complaint/.test(text)) return 'COMPLAINT';
    return 'GENERAL_QUESTION';
  }

  private async runEngine(input: {
    businessId: string;
    conversationId: string;
    customerId: string;
    content: string;
    intent: string;
    products: Product[];
    deliveryInfo: string | null;
    workingHours: string | null;
    paymentInfo: string | null;
    faqs: string | null;
    history: { role: MessageRole; content: string }[];
  }): Promise<{
    reply: string;
    intent: string;
    toolsUsed: ToolName[];
    order: unknown;
    needsHuman: boolean;
  }> {
    const toolsUsed: ToolName[] = [];
    const product = input.products[0] ?? null;
    let order: unknown = null;
    let needsHuman = false;
    let intent = input.intent;

    if (input.intent === 'HUMAN_REQUEST') {
      toolsUsed.push('transferToHuman', 'notifyOwner');
      needsHuman = true;
      await this.executeTool('transferToHuman', input, {});
      await this.executeTool('notifyOwner', input, {
        title: 'طلب تدخل بشري',
        body: 'عميل طلب التحدث مع شخص.',
      });
      return {
        reply: 'تمام، هحوّلك لحد من الفريق دلوقتي. هيتواصل معاك في أقرب وقت ❤️',
        intent,
        toolsUsed,
        order,
        needsHuman,
      };
    }

    if (input.intent === 'PRICE_INQUIRY') {
      toolsUsed.push('getProduct');
      const info = await this.executeTool('getProduct', input, {
        productId: product?.id,
      });
      const p = info as Product | null;
      if (!p) {
        return {
          reply:
            'حاليًا مفيش منتجات مضافة. ضيف منتجات من لوحة التحكم عشان أقدر أجاوب على الأسعار.',
          intent,
          toolsUsed,
          order,
          needsHuman,
        };
      }
      return {
        reply: `أهلًا ❤️ المنتج "${p.name}" سعره ${p.priceEgp} جنيه. تحب تعرف المقاسات والألوان المتاحة؟`,
        intent,
        toolsUsed,
        order,
        needsHuman,
      };
    }

    if (input.intent === 'AVAILABILITY') {
      toolsUsed.push('checkStock');
      const stock = (await this.executeTool('checkStock', input, {
        productId: product?.id,
        size: this.extractSize(input.content),
      })) as {
        inStock: boolean;
        sizes: string[];
        colors: string[];
        name: string;
      } | null;
      if (!stock) {
        return {
          reply: 'مفيش منتج متاح للتحقق منه دلوقتي.',
          intent,
          toolsUsed,
          order,
          needsHuman,
        };
      }
      const size = this.extractSize(input.content);
      const sizeNote = size
        ? stock.sizes.length === 0 || stock.sizes.includes(size)
          ? `أيوه، ${size} متوفر حاليًا.`
          : `المقاس ${size} مش متاح حاليًا.`
        : stock.inStock
          ? 'المنتج متوفر حاليًا.'
          : 'المنتج غير متوفر حاليًا.';
      const colors =
        stock.colors.length > 0
          ? ` متاح ${stock.colors.join(' و')}.`
          : '';
      return {
        reply: `${sizeNote}${colors} تحب تطلب؟`,
        intent,
        toolsUsed,
        order,
        needsHuman,
      };
    }

    if (input.intent === 'DELIVERY_QUESTION') {
      toolsUsed.push('getDeliveryInfo');
      const delivery = (await this.executeTool(
        'getDeliveryInfo',
        input,
        {},
      )) as string;
      return {
        reply: delivery || 'التوصيل متاح — تفاصيل التوصيل هتتأكد عند تأكيد الطلب.',
        intent,
        toolsUsed,
        order,
        needsHuman,
      };
    }

    if (input.intent === 'PURCHASE_INTENT') {
      const extracted = this.extractCustomerInfo(input.content, input.history);
      if (!extracted.name || !extracted.phone) {
        return {
          reply: 'تمام ❤️ ممكن الاسم ورقم الموبايل عشان أسجّل الطلب؟',
          intent,
          toolsUsed,
          order,
          needsHuman,
        };
      }

      if (!product) {
        return {
          reply: 'محتاج تضيف منتج الأول عشان أقدر أسجّل الطلب.',
          intent,
          toolsUsed,
          order,
          needsHuman,
        };
      }

      toolsUsed.push('createOrder', 'notifyOwner');
      order = await this.executeTool('createOrder', input, {
        productId: product.id,
        customerName: extracted.name,
        customerPhone: extracted.phone,
        size: this.extractSize(
          [...input.history.map((h) => h.content), input.content].join(' '),
        ),
        quantity: 1,
      });
      return {
        reply: `تم تسجيل طلبك بنجاح ✅ رقم الطلب #${(order as { orderNumber: number }).orderNumber}. الفريق هيتواصل معاك قريبًا.`,
        intent,
        toolsUsed,
        order,
        needsHuman,
      };
    }

    // GENERAL — maybe name/phone after purchase ask
    const lastAi = [...input.history].reverse().find((m) => m.role === 'AI');
    if (
      lastAi &&
      /الاسم ورقم|رقم الموبايل/.test(lastAi.content) &&
      this.extractCustomerInfo(input.content, []).phone
    ) {
      intent = 'PURCHASE_INTENT';
      return this.runEngine({ ...input, intent: 'PURCHASE_INTENT' });
    }

    if (product) {
      return {
        reply: `أهلًا! أقدر أساعدك بخصوص "${product.name}". تقدر تسأل عن السعر، التوفر، أو تطلب مباشرة.`,
        intent,
        toolsUsed,
        order,
        needsHuman,
      };
    }

    return {
      reply:
        'أهلًا! أنا مساعد المبيعات. اسأل عن السعر أو التوفر أو اكتب "عايز أطلب" عشان نبدأ الطلب.',
      intent,
      toolsUsed,
      order,
      needsHuman,
    };
  }

  private async executeTool(
    name: ToolName,
    ctx: {
      businessId: string;
      conversationId: string;
      customerId: string;
      deliveryInfo: string | null;
      workingHours: string | null;
      paymentInfo: string | null;
    },
    args: Record<string, unknown>,
  ) {
    switch (name) {
      case 'getProduct': {
        if (args.productId) {
          return this.prisma.product.findFirst({
            where: {
              id: String(args.productId),
              businessId: ctx.businessId,
            },
          });
        }
        return this.prisma.product.findFirst({
          where: { businessId: ctx.businessId },
        });
      }
      case 'checkStock': {
        const product = await this.prisma.product.findFirst({
          where: {
            businessId: ctx.businessId,
            ...(args.productId ? { id: String(args.productId) } : {}),
          },
        });
        if (!product) return null;
        return {
          name: product.name,
          inStock: product.inStock,
          sizes: product.sizes,
          colors: product.colors,
        };
      }
      case 'getDeliveryInfo': {
        const parts = [
          ctx.deliveryInfo,
          ctx.workingHours ? `ساعات العمل: ${ctx.workingHours}` : null,
          ctx.paymentInfo ? `الدفع: ${ctx.paymentInfo}` : null,
        ].filter(Boolean);
        return parts.join('\n') || null;
      }
      case 'createOrder': {
        const product = await this.prisma.product.findFirst({
          where: {
            id: String(args.productId),
            businessId: ctx.businessId,
          },
        });
        if (!product) throw new Error('Product required for order');

        const last = await this.prisma.order.findFirst({
          where: { businessId: ctx.businessId },
          orderBy: { orderNumber: 'desc' },
        });
        const orderNumber = (last?.orderNumber ?? 1000) + 1;
        const quantity = Number(args.quantity ?? 1);
        const size = args.size ? String(args.size) : null;
        const customerName = String(args.customerName);
        const customerPhone = String(args.customerPhone);

        await this.prisma.customer.update({
          where: { id: ctx.customerId },
          data: { name: customerName, phone: customerPhone },
        });

        const order = await this.prisma.order.create({
          data: {
            businessId: ctx.businessId,
            customerId: ctx.customerId,
            conversationId: ctx.conversationId,
            orderNumber,
            totalEgp: product.priceEgp * quantity,
            customerName,
            customerPhone,
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
            status: LeadStatus.NEW,
          },
          data: { status: LeadStatus.CONVERTED },
        });

        await this.notifications.create(ctx.businessId, {
          type: NotificationType.ORDER,
          title: 'طلب جديد',
          body: `${customerName} طلب ${product.name}${size ? ` — ${size}` : ''} بقيمة ${order.totalEgp} ج.م`,
          data: { orderId: order.id, orderNumber },
        });

        return order;
      }
      case 'transferToHuman': {
        await this.prisma.conversation.update({
          where: { id: ctx.conversationId },
          data: { needsHuman: true, status: 'NEEDS_HUMAN' },
        });
        return { ok: true };
      }
      case 'notifyOwner': {
        await this.notifications.create(ctx.businessId, {
          type: NotificationType.HANDOFF,
          title: String(args.title ?? 'تنبيه'),
          body: String(args.body ?? ''),
          data: { conversationId: ctx.conversationId },
        });
        return { ok: true };
      }
      default:
        return null;
    }
  }

  private extractSize(text: string): string | null {
    const match = text.toUpperCase().match(/\b(XXL|XL|L|M|S)\b/);
    return match?.[1] ?? null;
  }

  private extractCustomerInfo(
    content: string,
    history: { role: MessageRole; content: string }[],
  ) {
    const blob = [...history.map((h) => h.content), content].join('\n');
    const phoneMatch = blob.match(/01[0-9]{8,9}/);
    const phone = phoneMatch?.[0] ?? null;

    let name: string | null = null;
    const namePhone = content.match(/^[\s]*([^\d\-–—]+?)[\s\-–—]+(01[0-9]{8,9})/);
    if (namePhone) {
      name = namePhone[1]!.trim();
    } else if (phone) {
      const before = content.replace(phone, '').replace(/[-–—]/g, '').trim();
      if (before.length >= 2 && before.length < 40) name = before;
    }

    return { name, phone };
  }
}
