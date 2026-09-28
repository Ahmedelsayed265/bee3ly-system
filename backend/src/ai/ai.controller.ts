import {
  Body,
  Controller,
  Get,
  HttpCode,
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
  AiSessionContextDto,
  ConversationModeDto,
  RunAiToolDto,
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

  /** Session catalog + shipping/payment block for external AI service. */
  @Post('session-context')
  @HttpCode(200)
  sessionContext(
    @CurrentUser() user: AuthUser,
    @Body() dto: AiSessionContextDto,
  ) {
    return this.ai.getSessionContext(user.id, dto);
  }

  /** Execute a validated sales tool (order, lead, stock, shipping quote). */
  @Post('run-tool')
  @HttpCode(200)
  runTool(@CurrentUser() user: AuthUser, @Body() dto: RunAiToolDto) {
    return this.ai.runTool(user.id, dto);
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
