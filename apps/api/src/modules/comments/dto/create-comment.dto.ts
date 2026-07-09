import { IsIn, IsString, IsUUID, Length } from "class-validator";

export class CreateCommentDto {
  @IsIn(["post", "review"])
  targetType!: "post" | "review";

  @IsUUID()
  targetId!: string;

  @IsString()
  @Length(1, 1000)
  body!: string;
}
