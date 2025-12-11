import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ComplaintResolutionAction {
  SUSTAIN = 'sustain',
  DISMISS = 'dismiss',
  ESCALATE = 'escalate',
}

export class ResolveComplaintDto {
  @IsEnum(ComplaintResolutionAction)
  action: ComplaintResolutionAction;

  @IsString()
  @IsOptional()
  resolution?: string;
}
