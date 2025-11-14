import { IsString, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';

export class CreateMarkmapDto {
  @IsString()
  title: string;

  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxWidth?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  colorFreezeLevel?: number;

  @IsOptional()
  @IsInt()
  initialExpandLevel?: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
