import { IsOptional, IsString, IsUUID, Length, ValidateIf } from "class-validator";

export class SendMessageDto {
  @ValidateIf((o: SendMessageDto) => !o.mediaId)
  @IsString()
  @Length(1, 4000)
  body?: string;

  @IsOptional()
  @IsUUID()
  mediaId?: string;
}
