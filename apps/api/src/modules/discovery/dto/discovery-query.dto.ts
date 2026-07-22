import { IsBooleanString, IsIn, IsOptional, IsString, Length } from "class-validator";

const ROLES = ["top", "more_top", "vers", "bottom", "more_bottom"] as const;
const BODY_TYPES = ["slim", "athletic", "stocky", "muscular", "average"] as const;
const STATUSES = ["positive", "negative", "prep", "tasp", "unknown"] as const;

export class DiscoveryQueryDto {
  @IsOptional()
  @IsIn(["distance", "new"])
  sort?: "distance" | "new";

  @IsOptional()
  @IsBooleanString()
  onlineOnly?: string;

  @IsOptional()
  @IsIn(ROLES)
  role?: (typeof ROLES)[number];

  @IsOptional()
  @IsIn(BODY_TYPES)
  bodyType?: (typeof BODY_TYPES)[number];

  @IsOptional()
  @IsIn(STATUSES)
  healthStatus?: (typeof STATUSES)[number];

  @IsOptional()
  @IsString()
  @Length(1, 50)
  hashtag?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;
}
