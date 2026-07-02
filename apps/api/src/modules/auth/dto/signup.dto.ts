import { IsEmail, IsString, Length, Matches } from "class-validator";

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(8, 128)
  password!: string;

  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: "country must be an ISO 3166-1 alpha-2 code" })
  country!: string;
}
