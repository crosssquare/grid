import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

const ROLES = ["top", "more_top", "vers", "bottom", "more_bottom"] as const;
const BODY_TYPES = ["slim", "athletic", "stocky", "muscular", "average"] as const;

export class UpsertProfileDto {
  @IsString()
  @Length(1, 60)
  displayName!: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  bio?: string;

  @IsOptional()
  @IsIn(ROLES)
  role?: (typeof ROLES)[number];

  @IsOptional()
  @IsIn(BODY_TYPES)
  bodyType?: (typeof BODY_TYPES)[number];

  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(99)
  age?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(250)
  heightCm?: number;
}
