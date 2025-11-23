import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateKeynodeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsIn([
    'person',
    'fictional_character',
    'geographical_location',
    'date_time',
    'historical_event',
    'biological_species',
    'abstract_concept',
    'others',
  ])
  category: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}
