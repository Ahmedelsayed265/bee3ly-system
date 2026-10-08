import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CampaignObjective,
  CampaignStatus,
  NotificationType,
} from '@prisma/client';
import {
  AttributionService,
  type AttributionChain,
} from '../analytics/attribution.service';
import { computeMetrics, EMPTY_DELIVERY } from '../analytics/campaign-metrics';
import { EntitlementsService } from '../billing/entitlements.service';
import { AI_ACTION_WEIGHTS } from '../billing/plans/limits';
import { UsageService } from '../billing/usage.service';
import { BusinessAccessService } from '../common/business-access.service';
import { pageMeta, pageWindow } from '../common/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeSocialAdCopy } from './campaign-ad-copy-style';
import { analyzeCampaignMetrics } from './campaign-analysis';
import { normalizeCampaignObjectives } from './campaign-objectives';
import { CampaignAiBrainsService } from './campaign-ai-brains.service';
import { CreateCampaignDto, DraftAdCopyDto } from './dto/campaign.dto';
import { MetaAdsService } from './meta-ads.service';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
    private readonly notifications: NotificationsService,
    private readonly attribution: AttributionService,
    private readonly config: ConfigService,
    private readonly campaignBrains: CampaignAiBrainsService,
    private readonly entitlements: EntitlementsService,
    private readonly usage: UsageService,
    private readonly metaAds: MetaAdsService,
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
      include: {
        insights: { orderBy: { date: 'desc' }, take: 14 },
      },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    const chains = await this.attribution.chains(businessId);
    return {
      campaign: this.withMetrics(campaign, chains.forCampaign(campaign.id)),
    };
  }

  async getAnalysis(userId: string, id: string, locale?: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, businessId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    const chains = await this.attribution.chains(businessId);
    const chain = chains.forCampaign(campaign.id);
    const loc = locale === 'en' ? 'en' : 'ar';
    const analysis = analyzeCampaignMetrics({
      locale: loc,
      name: campaign.name,
      objective: campaign.objective,
      status: campaign.status,
      budget: campaign.budget,
      conversations: chain.conversations,
      leads: chain.leads,
      orders: chain.orders,
      revenueEgp: chain.revenueEgp,
      costOfGoodsEgp: chain.costOfGoodsEgp,
      shippingEgp: chain.shippingEgp,
      returnShippingEgp: chain.returnShippingEgp,
      spendEgp: null,
    });

    const canAnalyze = await this.usage.hasAiCapacity(
      businessId,
      AI_ACTION_WEIGHTS.productAnalysis,
    );
    const enriched = canAnalyze
      ? await this.campaignBrains.enrichAnalysis(businessId, {
          locale: loc,
          campaign: {
            id: campaign.id,
            name: campaign.name,
            objective: campaign.objective,
            status: campaign.status,
            budget: campaign.budget,
            offer: campaign.offer,
          },
          rules: analysis,
        })
      : null;

    if (enriched && enriched.mode !== 'rules') {
      await this.usage.consumeAi(
        businessId,
        AI_ACTION_WEIGHTS.productAnalysis,
        'campaign_analysis',
        campaign.id,
      );
    }

    if (enriched) {
      return {
        analysis: {
          ...analysis,
          summary: enriched.summary,
          bullets:
            enriched.bullets.length > 0 ? enriched.bullets : analysis.bullets,
        },
        mode: enriched.mode,
        brain: 'analysis_decisions' as const,
      };
    }

    return {
      analysis,
      mode: 'rules' as const,
      brain: 'analysis_decisions' as const,
    };
  }

  async create(userId: string, dto: CreateCampaignDto) {
    const businessId = await this.access.requireBusinessId(userId);
    await this.entitlements.assertCanCreateCampaign(businessId);
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    });

    const goals = normalizeCampaignObjectives({
      objectives: dto.objectives,
      objective: dto.objective,
    });
    const recommendation = this.buildRecommendation(dto, business.name, goals);
    const campaign = await this.prisma.campaign.create({
      data: {
        businessId,
        name: recommendation.name,
        objective: goals.primary,
        objectives: goals.objectives,
        status: CampaignStatus.READY,
        offer: dto.offer,
        audienceDescription: dto.audienceDescription,
        audiences: dto.audiences ?? [],
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

  async activate(userId: string, id: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const campaign = await this.metaAds.setDelivery(businessId, id, 'ACTIVE');
    const chains = await this.attribution.chains(businessId);
    return {
      campaign: this.withMetrics(campaign, chains.forCampaign(campaign.id)),
      published: true,
      notice: 'Activated on Meta. It can spend now.',
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

    if (
      this.metaAds.enabled() &&
      (status === CampaignStatus.ASSISTED_LAUNCH ||
        status === CampaignStatus.ACTIVE)
    ) {
      const published = await this.metaAds.publish(businessId, id);
      if (published) {
        const chains = await this.attribution.chains(businessId);
        return {
          campaign: this.withMetrics(
            published,
            chains.forCampaign(published.id),
          ),
          published: published.status !== CampaignStatus.FAILED,
          notice:
            published.status === CampaignStatus.FAILED
              ? (published.metaErrorUserMsg ??
                'Meta publish failed. Retry uses the IDs already saved.')
              : 'Created on Meta as PAUSED. Activate when you want it to spend.',
        };
      }
    }

    if (
      this.metaAds.enabled() &&
      status === CampaignStatus.PAUSED &&
      existing.metaCampaignId
    ) {
      const paused = await this.metaAds.setDelivery(businessId, id, 'PAUSED');
      const chains = await this.attribution.chains(businessId);
      return {
        campaign: this.withMetrics(paused, chains.forCampaign(paused.id)),
        published: true,
        notice: 'Paused on Meta.',
      };
    }

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
    const measured = computeMetrics(chain, EMPTY_DELIVERY, campaign.objective);
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

    const locale = dto.locale === 'en' ? 'en' : 'ar';
    const rulesCopy = () => {
      const adCopy = this.fallbackAdCopy(dto.name.trim(), product);
      return {
        adCopy,
        adCopyVariations: [],
        headline: dto.name.trim(),
        valueProposition: dto.valueProposition?.trim() ?? '',
        cta: '',
        creativeBrief: '',
        audienceHint: '',
        mode: 'rules' as const,
      };
    };
    const canDraft = await this.usage.hasAiCapacity(
      businessId,
      AI_ACTION_WEIGHTS.productAnalysis,
    );
    const content = canDraft
      ? await this.campaignBrains.generateContent(
          businessId,
          {
            name: dto.name.trim(),
            productId: dto.productId,
            objective: dto.objective,
            audienceDescription: dto.audienceDescription,
            budget: dto.budget,
            valueProposition: dto.valueProposition,
            locale,
            product: {
              name: product.name,
              description: product.description,
              priceEgp: product.priceEgp,
            },
          },
          rulesCopy,
        )
      : rulesCopy();
    if (content.mode !== 'rules') {
      await this.usage.consumeAi(
        businessId,
        AI_ACTION_WEIGHTS.productAnalysis,
        'campaign_copy',
        dto.productId,
      );
    }

    return {
      copy: sanitizeSocialAdCopy(content.adCopy),
      brain: 'content_creator' as const,
      mode: content.mode,
      content: {
        adCopy: content.adCopy,
        adCopyVariations: content.adCopyVariations,
        headline: content.headline,
        valueProposition: content.valueProposition,
        cta: content.cta,
        creativeBrief: content.creativeBrief,
        audienceHint: content.audienceHint,
      },
    };
  }

  private fallbackAdCopy(
    campaignName: string,
    product: { name: string; description: string | null; priceEgp: number },
  ) {
    const lines = [`${campaignName} 🔥`, `${product.name} — جودة تستاهل 💪`];
    if (product.description?.trim()) {
      lines.push(product.description.trim().slice(0, 200));
    }
    lines.push('كلمنا في رسالة واطلبه دلوقتي 📩', '#تسوق #مصر #عروض');
    return sanitizeSocialAdCopy(lines.join('\n'));
  }

  private buildRecommendation(
    dto: CreateCampaignDto,
    businessName: string,
    goals: ReturnType<typeof normalizeCampaignObjectives>,
  ) {
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
      suggestedMessaging: `لو بتدور على ${dto.offer} — كلّمنا ونساعدك توصل لـ${goals.objectives.map((o) => objectiveLabel[o]).join(' و')} بسهولة.`,
      suggestedCta: ctaMap[goals.primary],
      suggestedCreative: `صورة واضحة للعرض + نص قصير عن الفائدة + دعوة للتعليق أو الرسالة.`,
    };
  }
}
