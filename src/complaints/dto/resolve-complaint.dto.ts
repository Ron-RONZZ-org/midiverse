import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ComplaintResolutionAction {
  SUSTAIN = 'sustain',
  DISMISS = 'dismiss',
}

export class ResolveComplaintDto {
  @IsEnum(ComplaintResolutionAction)
  action: ComplaintResolutionAction;

  @IsString()
  @IsOptional()
  resolution?: string;
}
