import { PartialType } from '@nestjs/mapped-types';
import { CreateMarkmapDto } from './create-markmap.dto';

export class UpdateMarkmapDto extends PartialType(CreateMarkmapDto) {}
