import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { ChatService } from "./chat.service";
import { ChatGateway } from "./chat.gateway";
import { StartConversationDto } from "./dto/start-conversation.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { ReactToMessageDto } from "./dto/react-to-message.dto";

@Controller()
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly gateway: ChatGateway
  ) {}

  @Post("conversations")
  start(@CurrentUser() userId: string, @Body() dto: StartConversationDto) {
    return this.chat.getOrCreate(userId, dto.otherUserId);
  }

  @Get("conversations")
  list(@CurrentUser() userId: string) {
    return this.chat.list(userId);
  }

  @Get("conversations/:id/messages")
  getMessages(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.chat.getMessages(userId, id);
  }

  @Post("conversations/:id/messages")
  async sendMessage(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto
  ) {
    const { message, otherUserId } = await this.chat.sendMessage(userId, id, dto.body, dto.mediaId);
    this.gateway.emitToUser(otherUserId, "message:new", { conversationId: id, message });
    return message;
  }

  @Put("conversations/:id/messages/:messageId/reaction")
  react(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("messageId", ParseUUIDPipe) messageId: string,
    @Body() dto: ReactToMessageDto
  ) {
    return this.chat.react(userId, id, messageId, dto.emoji);
  }

  @Delete("conversations/:id/messages/:messageId/reaction")
  unreact(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("messageId", ParseUUIDPipe) messageId: string
  ) {
    return this.chat.unreact(userId, id, messageId);
  }

  @Post("conversations/meet/:otherUserId")
  confirmMeet(@CurrentUser() userId: string, @Param("otherUserId", ParseUUIDPipe) otherUserId: string) {
    return this.chat.confirmMeet(userId, otherUserId);
  }
}
