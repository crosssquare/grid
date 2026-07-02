import { IsUUID } from "class-validator";

export class SendTapDto {
  @IsUUID()
  recipientId!: string;
}
