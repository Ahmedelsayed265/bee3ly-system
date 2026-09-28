import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BusinessAccessService } from '../common/business-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { parseShippingZones } from './shipping-zones';
import { businessUsesPhysicalHours } from './uses-physical-hours';

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
    const { completeOnboarding, variantDictionary, shippingZones, ...data } =
      dto;

    const current = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { type: true },
    });
    const effectiveType = data.type ?? current.type;
    const stripWorkingHours = !businessUsesPhysicalHours(effectiveType);

    const business = await this.prisma.business.update({
      where: { id: businessId },
      data: {
        ...data,
        ...(stripWorkingHours ? { workingHours: null } : {}),
        ...(variantDictionary !== undefined
          ? {
              variantDictionary:
                variantDictionary as unknown as Prisma.InputJsonValue,
            }
          : {}),
        ...(shippingZones !== undefined
          ? {
              shippingZones: parseShippingZones(
                shippingZones,
              ) as unknown as Prisma.InputJsonValue,
            }
          : {}),
        ...(completeOnboarding ? { onboardingCompletedAt: new Date() } : {}),
      },
    });

    return { business };
  }
}
