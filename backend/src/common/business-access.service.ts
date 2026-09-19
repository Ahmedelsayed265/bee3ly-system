import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireMembership(userId: string) {
    const membership = await this.prisma.teamMember.findFirst({
      where: { userId },
      include: { business: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!membership) {
      throw new NotFoundException('No business found for this user');
    }

    return membership;
  }

  async requireBusinessId(userId: string) {
    const membership = await this.requireMembership(userId);
    return membership.businessId;
  }

  async assertBusinessAccess(userId: string, businessId: string) {
    const membership = await this.prisma.teamMember.findUnique({
      where: {
        businessId_userId: { businessId, userId },
      },
    });

    if (!membership) {
      throw new ForbiddenException('No access to this business');
    }

    return membership;
  }
}
