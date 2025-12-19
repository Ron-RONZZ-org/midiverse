import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { IsValidUsername } from '../../common/validators/username.validator';

export class SignUpDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsValidUsername({
    message:
      'Username must be at least 3 characters long, contain only letters, numbers, underscores, or hyphens, and start with a letter or number',
  })
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  turnstileToken?: string;
}
