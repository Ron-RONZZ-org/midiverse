import { IsOptional, IsString, IsArray, IsIn } from 'class-validator';

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

  @IsOptional()
  @IsIn(['newest', 'oldest', 'relevant', 'views'])
  sortBy?: 'newest' | 'oldest' | 'relevant' | 'views';
}
