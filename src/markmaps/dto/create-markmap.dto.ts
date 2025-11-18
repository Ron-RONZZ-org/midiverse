import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreateMarkmapDto {
  @IsString()
  title: string;

  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsUUID()
  seriesId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

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
