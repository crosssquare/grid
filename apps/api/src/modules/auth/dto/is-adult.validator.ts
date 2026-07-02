import { registerDecorator, ValidationOptions } from "class-validator";

function isAtLeast18(dateOfBirth: string): boolean {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;

  return age >= 18;
}

/**
 * Phase 0's only enforcement of the "hard block under-18 signups" requirement (PRD §7.1) —
 * a real accredited age-assurance vendor replaces this in Phase 1, but date-of-birth math
 * costs nothing and closes an otherwise-wide-open gap until then.
 */
export function IsAdult(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isAdult",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === "string" && isAtLeast18(value);
        },
        defaultMessage() {
          return "You must be at least 18 years old to sign up";
        }
      }
    });
  };
}
