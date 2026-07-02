import { IsDateString, IsEmail, IsString, Length, Matches } from "class-validator";
import { IsAdult } from "./is-adult.validator";

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(8, 128)
  password!: string;

  @IsDateString()
  @IsAdult()
  dateOfBirth!: string;

  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: "country must be an ISO 3166-1 alpha-2 code" })
  country!: string;
}
