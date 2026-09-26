import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';

export type MerchantTokenPayload = {
  sub: string;
  iss: 'bee3ly-core';
  aud: 'ai-service';
  scope: 'products:read conversations:read';
  iat: number;
  exp: number;
};

@Injectable()
export class MerchantTokenService {
  private readonly logger = new Logger(MerchantTokenService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Issue a short-lived signed JWT authorizing the AI Service to
   * access only the given merchant's data (products, conversations, …).
   *
   * The token does NOT contain PII — it only identifies the scoped
   * merchant ID + explicit read scopes.
   */
  async issueForMerchant(businessId: string): Promise<string> {
    const secret = this.config.get<string>('AI_SERVICE_TOKEN_SECRET');
    if (!secret) {
      this.logger.warn(
        'AI_SERVICE_TOKEN_SECRET missing — falling back to JWT_ACCESS_SECRET. ' +
          'Set a dedicated AI_SERVICE_TOKEN_SECRET in production.',
      );
    }
    const effectiveSecret =
      secret ?? this.config.getOrThrow<string>('JWT_ACCESS_SECRET');

    const ttl = this.config.get<string>(
      'AI_SERVICE_TOKEN_TTL',
      '1h',
    ) as StringValue;

    return this.jwt.signAsync(
      {
        sub: businessId,
        iss: 'bee3ly-core',
        aud: 'ai-service',
        scope: 'products:read conversations:read',
      } as const,
      {
        secret: effectiveSecret,
        expiresIn: ttl,
      },
    );
  }

  /**
   * Verify and decode a merchant token. Intended for in-process
   * validation helpers; the real AI Service validates independently
   * using the same shared secret.
   *
   * Returns the decoded payload on success, or null for any invalid
   * token (signature fail, expired, wrong audience/issuer, tampered).
   */
  async verify(token: string): Promise<MerchantTokenPayload | null> {
    const secret =
      this.config.get<string>('AI_SERVICE_TOKEN_SECRET') ??
      this.config.get<string>('JWT_ACCESS_SECRET');
    if (!secret) return null;
    try {
      const decoded = (await this.jwt.verifyAsync(token, {
        secret,
        issuer: 'bee3ly-core',
        audience: 'ai-service',
      })) as MerchantTokenPayload;
      if (!decoded.sub || typeof decoded.sub !== 'string') return null;
      return decoded;
    } catch (e) {
      this.logger.debug(
        `Merchant token verify failed: ${e instanceof Error ? e.message : 'unknown'}`,
      );
      return null;
    }
  }
}
