import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { KEYNODE_CATEGORIES } from './create-keynode.dto';

export class AdminCreateKeynodeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(KEYNODE_CATEGORIES)
  category: string;

  @IsString()
  @IsOptional()
  parentId?: string | null;
}
