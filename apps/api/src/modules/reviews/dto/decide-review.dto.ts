import { IsIn, ValidateIf } from "class-validator";

const DECISIONS = ["approved", "rejected"] as const;
const VISIBILITIES = ["public", "private"] as const;

export class DecideReviewDto {
  @IsIn(DECISIONS)
  decision!: (typeof DECISIONS)[number];

  @ValidateIf((dto: DecideReviewDto) => dto.decision === "approved")
  @IsIn(VISIBILITIES)
  visibility?: (typeof VISIBILITIES)[number];
}
