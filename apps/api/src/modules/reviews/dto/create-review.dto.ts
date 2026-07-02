import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from "class-validator";

export class CreateReviewDto {
  @IsUUID()
  revieweeId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  body?: string;
}
