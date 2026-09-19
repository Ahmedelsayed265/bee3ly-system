import { Injectable } from '@nestjs/common';
import { BusinessAccessService } from '../common/business-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
  ) {}

  async getMine(userId: string) {
    const membership = await this.access.requireMembership(userId);
    const agent = await this.prisma.aIAgent.findUnique({
      where: { businessId: membership.businessId },
    });
    const socialAccounts = await this.prisma.socialAccount.findMany({
      where: { businessId: membership.businessId },
      select: {
        id: true,
        platform: true,
        displayName: true,
        externalId: true,
        connectedAt: true,
      },
    });

    return {
      business: membership.business,
      role: membership.role,
      aiAgent: agent,
      socialAccounts,
    };
  }

  async updateMine(userId: string, dto: UpdateBusinessDto) {
    const businessId = await this.access.requireBusinessId(userId);
    const { completeOnboarding, ...data } = dto;

    const business = await this.prisma.business.update({
      where: { id: businessId },
      data: {
        ...data,
        ...(completeOnboarding
          ? { onboardingCompletedAt: new Date() }
          : {}),
      },
    });

    return { business };
  }
}
