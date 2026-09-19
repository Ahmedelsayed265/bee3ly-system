import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversationsService } from './conversations.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get('conversations')
  list(@CurrentUser() user: AuthUser) {
    return this.conversations.list(user.id);
  }

  @Get('conversations/:id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.conversations.getOne(user.id, id);
  }

  @Get('leads')
  listLeads(@CurrentUser() user: AuthUser) {
    return this.conversations.listLeads(user.id);
  }
}
