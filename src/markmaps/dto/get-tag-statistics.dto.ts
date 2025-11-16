import { IsString, IsOptional, IsIn } from 'class-validator';

export class GetTagStatisticsDto {
  @IsString()
  @IsOptional()
  @IsIn(['all', '24h', '1h'])
  timeFilter?: 'all' | '24h' | '1h';

  @IsString()
  @IsOptional()
  tag?: string; // For historical trend
}
