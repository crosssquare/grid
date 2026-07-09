import { IsIn } from "class-validator";

// The charm bar deliberately offers exactly two reactions.
export class ReactToMessageDto {
  @IsIn(["🔥", "🐷"])
  emoji!: string;
}
