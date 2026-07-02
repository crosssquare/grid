import { IsIn, IsOptional, IsString, IsUUID, Length } from "class-validator";

const REASON_CODES = [
  "fake_profile",
  "underage_concern",
  "harassment",
  "spam",
  "illegal_content",
  "csam"
] as const;

export class CreateReportDto {
  @IsUUID()
  reportedUserId!: string;

  @IsIn(REASON_CODES)
  reasonCode!: (typeof REASON_CODES)[number];

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  detail?: string;
}
