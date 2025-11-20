import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class SignUpDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  turnstileToken?: string;
}
