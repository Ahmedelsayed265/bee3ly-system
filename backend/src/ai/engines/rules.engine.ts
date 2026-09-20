import { Injectable } from '@nestjs/common';
import type {
  AiEngineResult,
  AiIntent,
  BusinessContext,
  ConversionStageName,
  ToolName,
} from '../types';
import { AiToolsService } from '../tools/ai-tools.service';

@Injectable()
export class RulesEngine {
  constructor(private readonly tools: AiToolsService) {}

  detectIntent(content: string): AiIntent {
    const text = content.toLowerCase();
    if (/عايز أكلم|كلم حد|موظف|human|agent|ممثل/.test(text))
      return 'HUMAN_REQUEST';
    if (/حجز|ميعاد|موعد|booking|appointment/.test(text)) return 'BOOKING_INTENT';
    if (/عايز أطلب|اطلب|هطلب|purchase|order|اشتري|هشتري/.test(text))
      return 'PURCHASE_INTENT';
    if (/سيب رقم|كلمني|مهتم|lead/.test(text)) return 'LEAD_INTENT';
    if (/سعر|كام|بكام|price|تكلفة/.test(text)) return 'PRICE_INQUIRY';
    if (/منتج|مواصفات|فيه إيه|product/.test(text)) return 'PRODUCT_QUESTION';
    if (/متوفر|موجود|مخزون|مقاس|size|xl|availability/.test(text))
      return 'AVAILABILITY';
    if (/توصيل|delivery|شحن/.test(text)) return 'DELIVERY_QUESTION';
    if (/فين طلبي|حالة الطلب|order status/.test(text)) return 'ORDER_STATUS';
    if (/شكوى|مشكلة|complaint|زعلان/.test(text)) return 'COMPLAINT';
    return 'GENERAL_QUESTION';
  }

  stageForIntent(
    intent: AiIntent,
    current: ConversionStageName,
  ): ConversionStageName {
    if (intent === 'HUMAN_REQUEST' || intent === 'COMPLAINT')
      return 'HUMAN_HANDOFF';
    if (intent === 'PURCHASE_INTENT') return 'PURCHASE_INTENT';
    if (intent === 'LEAD_INTENT' || intent === 'BOOKING_INTENT')
      return 'QUALIFICATION';
    if (
      intent === 'PRICE_INQUIRY' ||
      intent === 'AVAILABILITY' ||
      intent === 'DELIVERY_QUESTION' ||
      intent === 'PRODUCT_QUESTION'
    ) {
      return current === 'NEW' ? 'DISCOVERY' : 'CONSIDERATION';
    }
    return current === 'NEW' ? 'DISCOVERY' : current;
  }

  async run(
    ctx: BusinessContext,
    forcedIntent?: AiIntent,
  ): Promise<AiEngineResult> {
    const toolsUsed: ToolName[] = [];
    let order: unknown = null;
    let lead: unknown = null;
    let needsHuman = false;
    let handoffReason: string | undefined;

    let intent = forcedIntent ?? this.detectIntent(ctx.latestCustomerMessage);
    let conversionStage = this.stageForIntent(intent, ctx.conversionStage);

    // Follow-up: customer sent name/phone after we asked
    const lastAi = [...ctx.history].reverse().find((m) => m.role === 'AI');
    if (
      intent === 'GENERAL_QUESTION' &&
      lastAi &&
      /الاسم ورقم|رقم الموبايل/.test(lastAi.content) &&
      this.extractCustomerInfo(ctx.latestCustomerMessage, []).phone
    ) {
      intent = 'PURCHASE_INTENT';
      conversionStage = 'DATA_COLLECTION';
    }

    if (intent === 'HUMAN_REQUEST' || intent === 'COMPLAINT') {
      if (!ctx.agent.handoffEnabled && intent === 'COMPLAINT') {
        return {
          reply: 'آسف لأي إزعاج. قولي المشكلة بالتفصيل وأنا هحاول أساعدك.',
          intent,
          toolsUsed,
          order,
          lead,
          needsHuman: false,
          conversionStage: 'CONSIDERATION',
          mode: 'rules',
          confidence: 0.7,
        };
      }
      toolsUsed.push('transferToHuman');
      handoffReason =
        intent === 'COMPLAINT' ? 'شكوى تحتاج تدخل بشري' : 'العميل طلب ممثل';
      await this.tools.execute('transferToHuman', ctx, {
        reason: handoffReason,
        summary: `Intent: ${intent}. Last message: ${ctx.latestCustomerMessage}`,
      });
      needsHuman = true;
      return {
        reply:
          'تمام، هحوّلك لحد من الفريق دلوقتي. هيتواصل معاك في أقرب وقت ❤️',
        intent,
        toolsUsed,
        order,
        lead,
        needsHuman,
        conversionStage: 'HUMAN_HANDOFF',
        handoffReason,
        mode: 'rules',
        confidence: 0.95,
      };
    }

    if (intent === 'PRICE_INQUIRY' || intent === 'PRODUCT_QUESTION') {
      toolsUsed.push('getProduct');
      const p = await this.tools.execute('getProduct', ctx, {});
      if (!p) {
        return {
          reply:
            'حاليًا مفيش منتجات/خدمات مضافة. الفريق يقدر يساعدك لو حابب تفاصيل أكتر.',
          intent,
          toolsUsed,
          order,
          lead,
          needsHuman: false,
          conversionStage,
          mode: 'rules',
          confidence: 0.8,
        };
      }
      const product = p as unknown as {
        name: string;
        priceEgp: number;
        description: string | null;
        attributes?: Record<string, unknown>;
      };
      const fromCtx = ctx.products.find((item) => item.name === product.name);
      const details =
        fromCtx && Object.keys(fromCtx.attributes).length
          ? Object.entries(fromCtx.attributes)
              .map(([k, v]) =>
                Array.isArray(v) ? `${k}: ${v.join(', ')}` : `${k}: ${String(v)}`,
              )
              .join(' · ')
          : '';
      return {
        reply:
          intent === 'PRODUCT_QUESTION'
            ? `عن "${product.name}": ${product.description ?? 'متاح'}${details ? ` — ${details}` : ''} — السعر ${product.priceEgp} ج.م. تحب تعرف التوفر أو تطلب؟`
            : `أهلًا ❤️ "${product.name}" سعره ${product.priceEgp} ج.م.${details ? ` (${details})` : ''} تحب تفاصيل أكتر أو تطلب؟`,
        intent,
        toolsUsed,
        order,
        lead,
        needsHuman: false,
        conversionStage,
        mode: 'rules',
        confidence: 0.9,
      };
    }

    if (intent === 'AVAILABILITY') {
      toolsUsed.push('checkStock');
      const size = this.extractSize(ctx.latestCustomerMessage);
      const stock = (await this.tools.execute('checkStock', ctx, {
        size,
      })) as {
        inStock: boolean;
        stockQuantity?: number | null;
        sizes: string[];
        colors: string[];
        details?: string;
        name: string;
      } | null;
      if (!stock) {
        return {
          reply: 'المعلومة دي مش موجودة عندنا حاليًا.',
          intent,
          toolsUsed,
          order,
          lead,
          needsHuman: false,
          conversionStage,
          mode: 'rules',
          confidence: 0.7,
        };
      }
      const sizeNote = size
        ? stock.sizes.length === 0 || stock.sizes.includes(size)
          ? `أيوه، ${size} متوفر.`
          : `الخيار ${size} مش متاح حاليًا.`
        : stock.stockQuantity != null
          ? stock.stockQuantity > 0
            ? `متوفر — الكمية الحالية ${stock.stockQuantity}.`
            : 'خلصت الكمية حاليًا.'
          : stock.inStock
            ? 'متوفر حاليًا.'
            : 'غير متوفر حاليًا.';
      const extras = stock.details
        ? ` التفاصيل: ${stock.details}.`
        : stock.colors.length > 0
          ? ` متاح ${stock.colors.join(' و')}.`
          : '';
      return {
        reply: `${sizeNote}${extras} تحب تطلب؟`,
        intent,
        toolsUsed,
        order,
        lead,
        needsHuman: false,
        conversionStage,
        mode: 'rules',
        confidence: 0.9,
      };
    }

    if (intent === 'DELIVERY_QUESTION') {
      toolsUsed.push('getDeliveryInfo');
      const delivery = (await this.tools.execute(
        'getDeliveryInfo',
        ctx,
        {},
      )) as { text: string | null };
      return {
        reply:
          delivery.text ||
          'التوصيل متاح — التفاصيل هتتأكد عند تأكيد الطلب.',
        intent,
        toolsUsed,
        order,
        lead,
        needsHuman: false,
        conversionStage,
        mode: 'rules',
        confidence: 0.85,
      };
    }

    if (intent === 'ORDER_STATUS') {
      toolsUsed.push('getOrderStatus');
      const existing = await this.tools.execute('getOrderStatus', ctx, {});
      if (!existing) {
        return {
          reply: 'مفيش طلب مرتبط بالحساب ده لسه. تحب نبدأ طلب جديد؟',
          intent,
          toolsUsed,
          order,
          lead,
          needsHuman: false,
          conversionStage,
          mode: 'rules',
          confidence: 0.8,
        };
      }
      const o = existing as { orderNumber: number; status: string; totalEgp: number };
      return {
        reply: `طلبك #${o.orderNumber} حالته ${o.status} بإجمالي ${o.totalEgp} ج.م.`,
        intent,
        toolsUsed,
        order: existing,
        lead,
        needsHuman: false,
        conversionStage,
        mode: 'rules',
        confidence: 0.9,
      };
    }

    if (intent === 'LEAD_INTENT' || intent === 'BOOKING_INTENT') {
      toolsUsed.push('createLead');
      lead = await this.tools.execute('createLead', ctx, {
        intent,
        notes: ctx.latestCustomerMessage,
      });
      return {
        reply:
          intent === 'BOOKING_INTENT'
            ? 'تمام! سجّلت اهتمامك بالحجز. الفريق هيتواصل معاك لتأكيد الموعد ❤️'
            : 'تم تسجيل اهتمامك ✅ فريقنا هيتواصل معاك قريبًا.',
        intent,
        toolsUsed,
        order,
        lead,
        needsHuman: false,
        conversionStage: 'QUALIFICATION',
        mode: 'rules',
        confidence: 0.85,
      };
    }

    if (intent === 'PURCHASE_INTENT') {
      const extracted = this.extractCustomerInfo(ctx.latestCustomerMessage, [
        ...ctx.history,
        {
          role: 'CUSTOMER',
          content: ctx.latestCustomerMessage,
        },
      ]);
      const name = extracted.name ?? ctx.customer.name;
      const phone = extracted.phone ?? ctx.customer.phone;
      if (!name || !phone) {
        conversionStage = 'DATA_COLLECTION';
        return {
          reply: 'تمام ❤️ ممكن الاسم ورقم الموبايل عشان أسجّل الطلب؟',
          intent,
          toolsUsed,
          order,
          lead,
          needsHuman: false,
          conversionStage,
          mode: 'rules',
          confidence: 0.9,
        };
      }

      const product = ctx.products.find((p) => p.inStock) ?? ctx.products[0];
      if (!product) {
        return {
          reply: 'محتاج نضيف منتج/خدمة الأول عشان أسجّل الطلب.',
          intent,
          toolsUsed,
          order,
          lead,
          needsHuman: false,
          conversionStage,
          mode: 'rules',
          confidence: 0.8,
        };
      }

      toolsUsed.push('createOrder');
      try {
        order = await this.tools.execute('createOrder', ctx, {
          productId: product.id,
          customerName: name,
          customerPhone: phone,
          size: this.extractSize(
            [...ctx.history.map((h) => h.content), ctx.latestCustomerMessage].join(
              ' ',
            ),
          ),
          quantity: 1,
        });
        conversionStage = 'CONVERTED';
        return {
          reply: `تم تسجيل طلبك بنجاح ✅ رقم الطلب #${(order as { orderNumber: number }).orderNumber}. الفريق هيتواصل معاك قريبًا.`,
          intent,
          toolsUsed,
          order,
          lead,
          needsHuman: false,
          conversionStage,
          mode: 'rules',
          confidence: 0.95,
        };
      } catch {
        return {
          reply:
            'مقدرتش أسجّل الطلب بالمعلومات دي. تأكد من الاسم ورقم موبايل مصري صحيح (01xxxxxxxxx).',
          intent,
          toolsUsed,
          order,
          lead,
          needsHuman: false,
          conversionStage: 'DATA_COLLECTION',
          mode: 'rules',
          confidence: 0.7,
        };
      }
    }

    // FAQ soft match
    if (ctx.business.faqs && /سؤال|faq|يعني إيه/.test(ctx.latestCustomerMessage.toLowerCase())) {
      toolsUsed.push('getFAQ');
      return {
        reply: `من الأسئلة الشائعة عندنا:\n${ctx.business.faqs.slice(0, 400)}`,
        intent,
        toolsUsed,
        order,
        lead,
        needsHuman: false,
        conversionStage,
        mode: 'rules',
        confidence: 0.6,
      };
    }

    if (ctx.products[0]) {
      return {
        reply: `أهلًا! أقدر أساعدك بخصوص "${ctx.products[0].name}". اسأل عن السعر أو التوفر أو اكتب "عايز أطلب".`,
        intent,
        toolsUsed,
        order,
        lead,
        needsHuman: false,
        conversionStage,
        mode: 'rules',
        confidence: 0.55,
      };
    }

    return {
      reply:
        'أهلًا! أنا مساعد المبيعات. اسأل عن السعر أو التوفر أو اكتب "عايز أطلب" عشان نبدأ.',
      intent,
      toolsUsed,
      order,
      lead,
      needsHuman: false,
      conversionStage,
      mode: 'rules',
      confidence: 0.5,
    };
  }

  extractSize(text: string): string | null {
    const match = text.toUpperCase().match(/\b(XXL|XL|L|M|S)\b/);
    return match?.[1] ?? null;
  }

  extractCustomerInfo(
    content: string,
    history: { role: string; content: string }[],
  ) {
    const blob = [...history.map((h) => h.content), content].join('\n');
    const phoneMatch = blob.match(/01[0-9]{8,9}/);
    const phone = phoneMatch?.[0] ?? null;

    let name: string | null = null;
    const namePhone = content.match(
      /^[\s]*([^\d\-–—]+?)[\s\-–—]+(01[0-9]{8,9})/,
    );
    if (namePhone) {
      name = namePhone[1]!.trim();
    } else if (phone) {
      const before = content.replace(phone, '').replace(/[-–—]/g, '').trim();
      if (before.length >= 2 && before.length < 40) name = before;
    }

    return { name, phone };
  }
}
