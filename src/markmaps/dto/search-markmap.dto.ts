import { IsOptional, IsString, IsArray } from 'class-validator';

export class SearchMarkmapDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
