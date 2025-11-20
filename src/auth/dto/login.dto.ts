import { IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  turnstileToken?: string;
}
