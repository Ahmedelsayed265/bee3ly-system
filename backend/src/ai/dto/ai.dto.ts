import { IsArray, IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

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
}
