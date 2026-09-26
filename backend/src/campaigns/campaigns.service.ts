import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CampaignObjective, CampaignStatus, NotificationType } from '@prisma/client';
import {
  AttributionService,
  type AttributionChain,
} from '../analytics/attribution.service';
import {
  computeMetrics,
  EMPTY_DELIVERY,
  type CampaignObjectiveId,
} from '../analytics/campaign-metrics';
import { BusinessAccessService } from '../common/business-access.service';
import { pageMeta, pageWindow } from '../common/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto, DraftAdCopyDto } from './dto/campaign.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
    private readonly notifications: NotificationsService,
    private readonly attribution: AttributionService,
    private readonly config: ConfigService,
  ) {}

  async list(userId: string, page = 1, limit = 10) {
    const businessId = await this.access.requireBusinessId(userId);
    const window = pageWindow(page, limit);
    const where = { businessId };
    const [campaigns, total, chains] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: window.skip,
        take: window.limit,
      }),
      this.prisma.campaign.count({ where }),
      this.attribution.chains(businessId),
    ]);
    return {
      campaigns: campaigns.map((campaign) =>
        this.withMetrics(campaign, chains.forCampaign(campaign.id)),
      ),
      ...pageMeta(total, window.page, window.limit),
    };
  }

  async getOne(userId: string, id: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, businessId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    const chains = await this.attribution.chains(businessId);
    return {
      campaign: this.withMetrics(campaign, chains.forCampaign(campaign.id)),
    };
  }

  async create(userId: string, dto: CreateCampaignDto) {
    const businessId = await this.access.requireBusinessId(userId);
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    });

    const recommendation = this.buildRecommendation(dto, business.name);
    const campaign = await this.prisma.campaign.create({
      data: {
        businessId,
        name: recommendation.name,
        objective: dto.objective,
        status: CampaignStatus.READY,
        offer: dto.offer,
        audienceDescription: dto.audienceDescription,
        budget: dto.budget,
        valueProposition:
          dto.valueProposition ?? recommendation.valueProposition,
        suggestedMessaging:
          dto.adCopy?.trim() || recommendation.suggestedMessaging,
        suggestedCta: recommendation.suggestedCta,
        suggestedCreative: recommendation.suggestedCreative,
        channel: dto.channel ?? 'FACEBOOK_INSTAGRAM',
      },
    });

    await this.notifications.create(businessId, {
      type: NotificationType.CAMPAIGN,
      title: 'الحملة جاهزة للمراجعة',
      body: `${campaign.name} · ميزانية ${campaign.budget} ج.م`,
      data: { campaignId: campaign.id },
    });

    const chains = await this.attribution.chains(businessId);
    return {
      campaign: this.withMetrics(campaign, chains.forCampaign(campaign.id)),
      recommendation,
    };
  }

  async launch(
    userId: string,
    id: string,
    status: CampaignStatus = CampaignStatus.ASSISTED_LAUNCH,
  ) {
    const businessId = await this.access.requireBusinessId(userId);
    const existing = await this.prisma.campaign.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Campaign not found');

    // Never pretend a real Meta ad was published
    const safeStatus =
      status === CampaignStatus.ACTIVE
        ? CampaignStatus.ASSISTED_LAUNCH
        : status === CampaignStatus.SIMULATED ||
            status === CampaignStatus.ASSISTED_LAUNCH ||
            status === CampaignStatus.PAUSED ||
            status === CampaignStatus.ARCHIVED
          ? status
          : CampaignStatus.ASSISTED_LAUNCH;

    const launching =
      safeStatus === CampaignStatus.ASSISTED_LAUNCH ||
      safeStatus === CampaignStatus.SIMULATED;
    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        status: safeStatus,
        ...(launching && !existing.startDate ? { startDate: new Date() } : {}),
      },
    });

    const title =
      safeStatus === CampaignStatus.SIMULATED
        ? 'حملة تجريبية'
        : safeStatus === CampaignStatus.PAUSED
          ? 'الحملة متوقفة'
          : safeStatus === CampaignStatus.ARCHIVED
            ? 'الحملة اتقفلت'
            : 'إطلاق بمساعدة الفريق';
    const body =
      safeStatus === CampaignStatus.SIMULATED
        ? `${campaign.name} — وضع محاكاة (لم تُنشَر إعلانًا حقيقيًا على Meta).`
        : safeStatus === CampaignStatus.PAUSED
          ? `${campaign.name} — متوقفة جوه Bee3ly.`
          : safeStatus === CampaignStatus.ARCHIVED
            ? `${campaign.name} — اتقفلت. المحادثات والطلبات لسه موجودة.`
            : `${campaign.name} — جاهزة للإطلاق بمساعدة bee3ly (مش نشر تلقائي على Meta بعد).`;

    await this.notifications.create(businessId, {
      type: NotificationType.CAMPAIGN,
      title,
      body,
      data: { campaignId: campaign.id, status: safeStatus },
    });

    const chains = await this.attribution.chains(businessId);
    return {
      campaign: this.withMetrics(campaign, chains.forCampaign(campaign.id)),
      published: false,
      notice:
        safeStatus === CampaignStatus.SIMULATED
          ? 'Simulation only — no real Meta ad was created.'
          : 'Assisted launch — bee3ly team/process will help publish; not auto-published via Ads API.',
    };
  }

  private withMetrics<T extends { id: string; objective: CampaignObjective }>(
    campaign: T,
    chain: AttributionChain,
  ) {
    const measured = computeMetrics(
      chain,
      EMPTY_DELIVERY,
      campaign.objective as CampaignObjectiveId,
    );
    return {
      ...campaign,
      conversations: chain.conversations,
      leads: chain.leads,
      orders: chain.orders,
      revenueEgp: chain.revenueEgp,
      costOfGoodsEgp: chain.costOfGoodsEgp,
      shippingEgp: chain.shippingEgp,
      returnShippingEgp: chain.returnShippingEgp,
      returnedOrders: chain.returnedOrders,
      returnedRevenueEgp: chain.returnedRevenueEgp,
      headline: measured.headline,
      metrics: measured.metrics,
    };
  }

  async draftAdCopy(userId: string, dto: DraftAdCopyDto) {
    const businessId = await this.access.requireBusinessId(userId);
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, businessId },
    });
    if (!product) throw new NotFoundException('Product not found');
    const copy = await this.writeAdCopy(dto.name.trim(), product);
    return { copy };
  }

  private async writeAdCopy(
    campaignName: string,
    product: { name: string; description: string | null; priceEgp: number },
  ) {
    const fallback = this.fallbackAdCopy(campaignName, product);
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) return fallback;

    const model =
      this.config.get<string>('OPENAI_MODEL')?.trim() || 'gpt-4o-mini';
    const description = product.description?.trim().slice(0, 400) ?? '';
    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            temperature: 0.6,
            messages: [
              {
                role: 'system',
                content:
                  'اكتب نص إعلان قصير بالعامية المصرية. من 3 إلى 5 سطور. استخدم اسم الحملة والمنتج والسعر والوصف فقط. متخترعش خصم أو مواصفات مش مكتوبة. من غير هاشتاجات.',
              },
              {
                role: 'user',
                content: `اسم الحملة: ${campaignName}\nالمنتج: ${product.name}\nالسعر: ${product.priceEgp} جنيه\nالوصف: ${description || 'غير متاح'}`,
              },
            ],
          }),
        },
      );
      if (!response.ok) return fallback;
      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = body.choices?.[0]?.message?.content?.trim();
      return text || fallback;
    } catch (error) {
      this.logger.warn(`Ad copy generation failed: ${error}`);
      return fallback;
    }
  }

  private fallbackAdCopy(
    campaignName: string,
    product: { name: string; description: string | null; priceEgp: number },
  ) {
    const lines = [
      campaignName,
      '',
      `${product.name} بـ ${product.priceEgp} جنيه.`,
    ];
    if (product.description?.trim()) lines.push(product.description.trim());
    lines.push('', 'ابعتلنا رسالة واطلبه دلوقتي.');
    return lines.join('\n');
  }

  private buildRecommendation(dto: CreateCampaignDto, businessName: string) {
    const objectiveLabel: Record<CampaignObjective, string> = {
      MORE_ORDERS: 'طلبات',
      MORE_LEADS: 'عملاء مهتمين',
      MORE_BOOKINGS: 'حجوزات',
      MORE_MESSAGES: 'رسائل',
      AWARENESS: 'وصول',
      TRAFFIC: 'زيارات',
      ENGAGEMENT: 'تفاعل',
      RETARGETING: 'إعادة استهداف',
    };
    const name = `${businessName} · ${dto.offer.slice(0, 28)}`;
    const ctaMap: Record<CampaignObjective, string> = {
      MORE_ORDERS: 'اطلب دلوقتي',
      MORE_LEADS: 'سيب بياناتك',
      MORE_BOOKINGS: 'احجز موعدك',
      MORE_MESSAGES: 'ابعت رسالة',
      AWARENESS: 'تابعونا',
      TRAFFIC: 'شوف التفاصيل',
      ENGAGEMENT: 'قولّنا رأيك',
      RETARGETING: 'العرض لسه متاح',
    };
    return {
      name,
      valueProposition:
        dto.valueProposition ??
        `عرض ${dto.offer} لجمهور ${dto.audienceDescription}`,
      suggestedMessaging: `لو بتدور على ${dto.offer} — كلّمنا ونساعدك توصل لـ${objectiveLabel[dto.objective]} بسهولة.`,
      suggestedCta: ctaMap[dto.objective],
      suggestedCreative: `صورة واضحة للعرض + نص قصير عن الفائدة + دعوة للتعليق أو الرسالة.`,
    };
  }
}
