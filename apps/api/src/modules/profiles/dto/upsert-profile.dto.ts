import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

const ROLES = ["top", "more_top", "vers", "bottom", "more_bottom"] as const;
const BODY_TYPES = ["slim", "athletic", "stocky", "muscular", "average"] as const;
const SIZES = ["s", "m", "l", "xl", "xxl"] as const;
const STATUSES = ["positive", "negative", "prep", "tasp", "unknown"] as const;
const DIRTY_PREFERENCES = ["dirty", "not_dirty", "ws_only"] as const;
const FISTING_PREFERENCES = ["ff_active", "ff_passive", "ff_vers", "no_ff"] as const;

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
  @Min(100)
  @Max(250)
  heightCm?: number;

  @IsOptional()
  @IsIn(SIZES)
  size?: (typeof SIZES)[number];

  @IsOptional()
  @IsIn(STATUSES)
  healthStatus?: (typeof STATUSES)[number];

  @IsOptional()
  @IsBoolean()
  smoker?: boolean;

  @IsOptional()
  @IsIn(DIRTY_PREFERENCES)
  dirtyPreference?: (typeof DIRTY_PREFERENCES)[number];

  @IsOptional()
  @IsIn(FISTING_PREFERENCES)
  fistingPreference?: (typeof FISTING_PREFERENCES)[number];
}
