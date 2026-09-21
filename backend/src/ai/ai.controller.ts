import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import {
  ConversationModeDto,
  SimulateMessageDto,
  UpdateAgentDto,
} from './dto/ai.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('agent')
  getAgent(@CurrentUser() user: AuthUser) {
    return this.ai.getAgent(user.id);
  }

  @Patch('agent')
  updateAgent(@CurrentUser() user: AuthUser, @Body() dto: UpdateAgentDto) {
    return this.ai.updateAgent(user.id, dto);
  }

  @Post('simulate-message')
  simulate(@CurrentUser() user: AuthUser, @Body() dto: SimulateMessageDto) {
    return this.ai.simulateMessage(user.id, dto.content, dto.conversationId);
  }

  @Patch('conversations/:id/mode')
  setMode(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ConversationModeDto,
  ) {
    return this.ai.setConversationMode(user.id, id, dto.mode);
  }
}
