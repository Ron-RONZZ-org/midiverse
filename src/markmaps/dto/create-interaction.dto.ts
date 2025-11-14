import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateInteractionDto {
  @IsString()
  type: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
