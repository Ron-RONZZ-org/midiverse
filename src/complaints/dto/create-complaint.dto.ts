import { IsEnum, IsString, MinLength } from 'class-validator';

export enum ComplaintReason {
  HARASSMENT = 'harassment',
  FALSE_INFORMATION = 'false_information',
  AUTHOR_RIGHT_INFRINGEMENT = 'author_right_infringement',
  INCITING_VIOLENCE_HATE = 'inciting_violence_hate',
  DISCRIMINATORY_ABUSIVE = 'discriminatory_abusive',
}

export class CreateComplaintDto {
  @IsEnum(ComplaintReason)
  reason: ComplaintReason;

  @IsString()
  @MinLength(20, { message: 'Explanation must be at least 5 words (20 characters)' })
  explanation: string;
}
