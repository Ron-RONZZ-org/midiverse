import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export const KEYNODE_CATEGORIES = [
  'person',
  'fictional_character',
  'geographical_location',
  'geological_form',
  'chemical',
  'astronomical_entity',
  'date_time',
  'historical_event',
  'biological_species',
  'abstract_concept',
  'others',
] as const;

export type KeynodeCategory = (typeof KEYNODE_CATEGORIES)[number];

export class CreateKeynodeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(KEYNODE_CATEGORIES)
  category: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}
