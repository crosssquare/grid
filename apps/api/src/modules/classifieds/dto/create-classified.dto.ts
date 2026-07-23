import { IsBoolean, IsDateString, IsLatitude, IsLongitude, IsOptional, IsString, Length } from "class-validator";

export class CreateClassifiedDto {
  @IsString()
  @Length(1, 2000)
  body!: string;

  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @IsOptional()
  @IsDateString()
  availableTo?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
