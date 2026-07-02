import { IsUUID } from "class-validator";

export class StartConversationDto {
  @IsUUID()
  otherUserId!: string;
}
