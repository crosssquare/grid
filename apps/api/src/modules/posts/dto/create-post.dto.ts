import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID, Length } from "class-validator";

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  body?: string;

  @IsOptional()
  @IsUUID()
  mediaId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsUUID(undefined, { each: true })
  mediaIds?: string[];
}
