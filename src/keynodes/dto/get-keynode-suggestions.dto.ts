import { IsString, IsOptional } from 'class-validator';

export class GetKeynoteSuggestionsDto {
  @IsString()
  @IsOptional()
  query?: string;
}
