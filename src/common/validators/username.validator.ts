import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsValidUsernameConstraint implements ValidatorConstraintInterface {
  validate(username: string) {
    if (!username) {
      return false;
    }

    // Check minimum length (3 characters)
    if (username.length < 3) {
      return false;
    }

    // Check for forbidden characters - only alphanumeric, underscore, and hyphen allowed
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(username)) {
      return false;
    }

    // Username must start with a letter or number
    if (!/^[a-zA-Z0-9]/.test(username)) {
      return false;
    }

    return true;
  }

  defaultMessage() {
    return 'Username must be at least 3 characters long, contain only letters, numbers, underscores, or hyphens, and start with a letter or number';
  }
}

export function IsValidUsername(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidUsernameConstraint,
    });
  };
}
