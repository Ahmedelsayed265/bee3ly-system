import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BillingMetricsService } from './billing.metrics.service';
import { BillingService } from './billing.service';
import {
  CheckoutDto,
  ConfirmPaymentDto,
  CreditCheckoutDto,
} from './dto/billing.dto';
import { WebhookService } from './webhook.service';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly webhooks: WebhookService,
    private readonly metrics: BillingMetricsService,
    private readonly config: ConfigService,
  ) {}

  @Get('catalog')
  @UseGuards(JwtAuthGuard)
  catalog() {
    return this.billing.catalog();
  }

  @Get('overview')
  @UseGuards(JwtAuthGuard)
  overview(@CurrentUser() user: AuthUser) {
    return this.billing.overview(user.id);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.billing.checkout(user.id, dto);
  }

  @Post('credits/checkout')
  @UseGuards(JwtAuthGuard)
  credits(@CurrentUser() user: AuthUser, @Body() dto: CreditCheckoutDto) {
    return this.billing.checkoutCredits(user.id, dto);
  }

  @Post('dev/confirm')
  @UseGuards(JwtAuthGuard)
  confirm(@CurrentUser() user: AuthUser, @Body() dto: ConfirmPaymentDto) {
    return this.billing.confirmDevPayment(user.id, dto.paymentId);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: AuthUser) {
    return this.billing.cancel(user.id);
  }

  @Post('pause')
  @UseGuards(JwtAuthGuard)
  pause(@CurrentUser() user: AuthUser) {
    return this.billing.pause(user.id);
  }

  @Post('resume')
  @UseGuards(JwtAuthGuard)
  resume(@CurrentUser() user: AuthUser) {
    return this.billing.resume(user.id);
  }

  @Get('metrics')
  async metricsSnapshot(@Headers('x-billing-metrics-key') key?: string) {
    const expected = this.config.get<string>('BILLING_METRICS_KEY')?.trim();
    if (!expected || key !== expected) {
      throw new UnauthorizedException('Not allowed');
    }
    return this.metrics.snapshot();
  }

  @Post('webhooks/paymob')
  @HttpCode(200)
  paymob(
    @Body() body: unknown,
    @Query('hmac') hmac?: string,
    @Headers('hmac') headerHmac?: string,
  ) {
    return this.webhooks.handlePaymob(body, hmac || headerHmac);
  }

  @Post('webhooks/tap')
  @HttpCode(200)
  tap(@Body() body: unknown, @Headers('hashstring') hash?: string) {
    return this.webhooks.handleTap(body, hash);
  }
}
