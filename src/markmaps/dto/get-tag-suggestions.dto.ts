import { IsString, IsOptional } from 'class-validator';

export class GetTagSuggestionsDto {
  @IsString()
  @IsOptional()
  query?: string;
}
