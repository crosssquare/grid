import { IsIn } from "class-validator";

const REASON_CODES = ["harassment", "defamation", "false_content", "personal_info", "other"] as const;

export class ReportReviewDto {
  @IsIn(REASON_CODES)
  reasonCode!: (typeof REASON_CODES)[number];
}
