import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

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
