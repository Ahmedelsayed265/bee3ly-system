import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import type { ToolName } from '../types';

export class SimulateMessageDto {
  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}

export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  primaryGoal?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondaryGoals?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  tone?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  commentFixedReply?: string;

  @IsOptional()
  @IsBoolean()
  handoffEnabled?: boolean;
}

export class ConversationModeDto {
  @IsIn(['AI', 'HUMAN'])
  mode!: 'AI' | 'HUMAN';
}

export class AiSessionContextDto {
  @IsString()
  conversationId!: string;

  @IsString()
  customerId!: string;

  @IsString()
  @MinLength(1)
  message!: string;
}

const TOOL_NAMES = [
  'getProduct',
  'checkStock',
  'getDeliveryInfo',
  'getBusinessInfo',
  'getFAQ',
  'quoteCheckout',
  'createOrder',
  'getOrderStatus',
  'createLead',
  'notifyOwner',
  'transferToHuman',
] as const satisfies readonly ToolName[];

export class RunAiToolDto {
  @IsString()
  conversationId!: string;

  @IsString()
  customerId!: string;

  @IsIn(TOOL_NAMES)
  tool!: ToolName;

  @IsOptional()
  @IsObject()
  args?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  message?: string;
}
