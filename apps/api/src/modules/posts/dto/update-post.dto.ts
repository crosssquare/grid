import { IsOptional, IsString, Length } from "class-validator";

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  body?: string;
}
