import { IsOptional, IsString } from 'class-validator';

export class SearchMarkmapDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  language?: string;
}
