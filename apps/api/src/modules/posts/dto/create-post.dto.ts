import { IsOptional, IsString, IsUUID, Length } from "class-validator";

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  body?: string;

  @IsOptional()
  @IsUUID()
  mediaId?: string;
}
