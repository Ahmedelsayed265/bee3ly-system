import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { PrismaService } from '../prisma/prisma.service';

export type MerchantTokenPayload = {
  sub: string;
  email: string;
  scope: 'products:read conversations:read';
  businessId: string;
  merchantId: string;
  customer_id: string;
  iat: number;
  exp: number;
};

@Injectable()
export class MerchantTokenService {
  private readonly logger = new Logger(MerchantTokenService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Issue a short-lived signed JWT that is 100% compatible with the AI
   * Service's Bearer authentication.
   *
   * COMPATIBILITY NOTES (critical):
   *   - The AI Service validates tokens the exact same way regular user
   *     logins do. That means the JWT MUST contain:
   *         { sub: "<USER_ID>", email: "<USER_EMAIL>" }
   *     AND be signed with JWT_ACCESS_SECRET.
   *   - Tokens that include iss/aud claims (or any shape other than what
   *     AuthService.issueTokens produces) are rejected as 401 Unauthorized.
   *   - We additionally embed businessId / merchantId / customer_id so the
   *     AI Service can immediately scope itself to this merchant's catalog
   *     without having to do a secondary user → business lookup.
   *
   * Resolution order for picking the user that represents this merchant:
   *   1) TeamMember with role = OWNER on the target Business.
   *   2) Any TeamMember on the target Business (fallback owner).
   *   3) If the Business truly has NO team members yet → fall back to a
   *      synthetic token scoped only to businessId. In practice this path
   *      should not happen (every business is created by a registered user).
   */
  async issueForMerchant(businessId: string): Promise<string> {
    const secret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    const ttl = this.config.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    ) as StringValue;

    const member = await this.prisma.teamMember.findFirst({
      where: { businessId, role: 'OWNER' },
      include: { user: { select: { id: true, email: true } } },
    });

    const fallbackMember = member
      ? null
      : await this.prisma.teamMember.findFirst({
          where: { businessId },
          include: { user: { select: { id: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        });

    const user = member?.user ?? fallbackMember?.user ?? null;

    if (!user) {
      this.logger.warn(
        `No TeamMember found for business=${businessId} — issuing a synthetic token. This will likely fail AI Service validation.`,
      );
      return this.jwt.signAsync(
        {
          sub: businessId,
          email: `merchant+${businessId}@bee3ly.local`,
          scope: 'products:read conversations:read',
          businessId,
          merchantId: businessId,
          customer_id: businessId,
        } as const,
        { secret, expiresIn: ttl },
      );
    }

    return this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        scope: 'products:read conversations:read',
        businessId,
        merchantId: businessId,
        customer_id: businessId,
      } as const,
      { secret, expiresIn: ttl },
    );
  }

  /**
   * Verify and decode a merchant token. Intended for in-process
   * validation helpers; the real AI Service validates independently
   * using the same shared secret.
   */
  async verify(token: string): Promise<MerchantTokenPayload | null> {
    const secret = this.config.get<string>('JWT_ACCESS_SECRET');
    if (!secret) return null;
    try {
      const decoded = (await this.jwt.verifyAsync(token, {
        secret,
      })) as unknown as MerchantTokenPayload;
      if (!decoded.sub || typeof decoded.sub !== 'string') return null;
      if (!decoded.email || typeof decoded.email !== 'string') return null;
      if (!decoded.businessId || typeof decoded.businessId !== 'string')
        return null;
      return decoded;
    } catch (e) {
      this.logger.debug(
        `Merchant token verify failed: ${e instanceof Error ? e.message : 'unknown'}`,
      );
      return null;
    }
  }
}
