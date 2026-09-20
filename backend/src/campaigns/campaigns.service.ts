import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CampaignObjective,
  CampaignStatus,
  NotificationType,
} from '@prisma/client';
import { BusinessAccessService } from '../common/business-access.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(userId: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const campaigns = await this.prisma.campaign.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
    return { campaigns };
  }

  async getOne(userId: string, id: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, businessId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return { campaign };
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
        valueProposition: dto.valueProposition ?? recommendation.valueProposition,
        suggestedMessaging: recommendation.suggestedMessaging,
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

    return { campaign, recommendation };
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

    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        status: safeStatus,
        startDate: new Date(),
      },
    });

    await this.notifications.create(businessId, {
      type: NotificationType.CAMPAIGN,
      title:
        safeStatus === CampaignStatus.SIMULATED
          ? 'حملة تجريبية'
          : 'إطلاق بمساعدة الفريق',
      body:
        safeStatus === CampaignStatus.SIMULATED
          ? `${campaign.name} — وضع محاكاة (لم تُنشَر إعلانًا حقيقيًا على Meta).`
          : `${campaign.name} — جاهزة للإطلاق بمساعدة bee3ly (مش نشر تلقائي على Meta بعد).`,
      data: { campaignId: campaign.id, status: safeStatus },
    });

    return {
      campaign,
      published: false,
      notice:
        safeStatus === CampaignStatus.SIMULATED
          ? 'Simulation only — no real Meta ad was created.'
          : 'Assisted launch — bee3ly team/process will help publish; not auto-published via Ads API.',
    };
  }

  private buildRecommendation(
    dto: CreateCampaignDto,
    businessName: string,
  ) {
    const objectiveLabel: Record<CampaignObjective, string> = {
      MORE_ORDERS: 'طلبات',
      MORE_LEADS: 'عملاء مهتمين',
      MORE_BOOKINGS: 'حجوزات',
      MORE_MESSAGES: 'رسائل',
    };
    const name = `${businessName} · ${dto.offer.slice(0, 28)}`;
    const ctaMap: Record<CampaignObjective, string> = {
      MORE_ORDERS: 'اطلب دلوقتي',
      MORE_LEADS: 'كلمينا على الخاص',
      MORE_BOOKINGS: 'احجز موعدك',
      MORE_MESSAGES: 'اسأل دلوقتي',
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
