import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import type { Response } from 'express';
import type { StringValue } from 'ms';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { AuthUser } from './decorators/current-user.decorator';

@Injectable()
export class AuthService {
  private readonly refreshCookieName = 'refresh_token';
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto, res: Response) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          name: dto.name.trim(),
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      const business = await tx.business.create({
        data: {
          name: dto.businessName.trim(),
          type: dto.businessType,
        },
      });

      await tx.teamMember.create({
        data: {
          businessId: business.id,
          userId: createdUser.id,
          role: 'OWNER',
        },
      });

      await tx.aIAgent.create({
        data: { businessId: business.id },
      });

      return createdUser;
    });

    const tokens = await this.issueTokens(user, res);
    return { user, accessToken: tokens.accessToken };
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };

    const tokens = await this.issueTokens(safeUser, res);
    return { user: safeUser, accessToken: tokens.accessToken };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    const generic = {
      success: true as const,
      message:
        'If an account exists for this email, a reset link has been sent.',
    };

    if (!user) {
      return generic;
    }

    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(rawToken),
        expiresAt,
      },
    });

    const frontendUrl = (
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173'
    )
      .split(',')[0]
      .trim();
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    this.logger.log(`Password reset link for ${email}: ${resetUrl}`);

    const isDev = this.config.get('NODE_ENV') !== 'production';
    return isDev ? { ...generic, resetUrl, resetToken: rawToken } : generic;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.deleteMany({
        where: {
          userId: stored.userId,
          usedAt: null,
          id: { not: stored.id },
        },
      }),
      this.prisma.refreshToken.deleteMany({
        where: { userId: stored.userId },
      }),
    ]);

    return { success: true, message: 'Password updated successfully' };
  }

  async refresh(refreshToken: string | undefined, res: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const safeUser = {
      id: stored.user.id,
      email: stored.user.email,
      name: stored.user.name,
      createdAt: stored.user.createdAt,
    };

    const tokens = await this.issueTokens(safeUser, res);
    return { user: safeUser, accessToken: tokens.accessToken };
  }

  async logout(refreshToken: string | undefined, res: Response) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
    }

    this.clearRefreshCookie(res);
    return { success: true };
  }

  async me(user: AuthUser) {
    let membership = await this.prisma.teamMember.findFirst({
      where: { userId: user.id },
      include: { business: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!membership) {
      const business = await this.prisma.business.create({
        data: {
          name: `${user.name}'s business`,
          type: 'OTHER',
        },
      });
      membership = await this.prisma.teamMember.create({
        data: {
          businessId: business.id,
          userId: user.id,
          role: 'OWNER',
        },
        include: { business: true },
      });
      await this.prisma.aIAgent.create({ data: { businessId: business.id } });
    }

    const freshUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    return {
      user: freshUser,
      business: membership.business,
      role: membership.role,
    };
  }

  async updateProfile(userId: string, dto: { name: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name.trim() },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    return { user };
  }

  async changePassword(
    userId: string,
    dto: { currentPassword: string; newPassword: string },
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { success: true, message: 'Password updated' };
  }

  private async issueTokens(
    user: { id: string; email: string },
    res: Response,
  ) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
          '15m',
        ) as StringValue,
      },
    );

    const refreshToken = randomBytes(48).toString('hex');
    const refreshDays = 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshDays);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });

    this.setRefreshCookie(res, refreshToken, expiresAt);
    return { accessToken };
  }

  private refreshCookieOptions() {
    const primaryFrontend = (
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173'
    )
      .split(',')[0]
      .trim();
    const crossSiteHttps = primaryFrontend.startsWith('https://');
    const isProd = this.config.get('NODE_ENV') === 'production';
    const secureCookie = isProd || crossSiteHttps;
    return {
      httpOnly: true,
      secure: secureCookie,
      sameSite: secureCookie ? 'none' : 'lax',
      path: '/auth',
    };
  }

  private setRefreshCookie(res: Response, token: string, expiresAt: Date) {
    res.cookie(this.refreshCookieName, token, {
      ...this.refreshCookieOptions(),
      expires: expiresAt,
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(this.refreshCookieName, this.refreshCookieOptions());
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
