import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { TapsService } from "./taps.service";
import { SendTapDto } from "./dto/send-tap.dto";

@Controller("taps")
@UseGuards(JwtAuthGuard)
export class TapsController {
  constructor(private readonly taps: TapsService) {}

  @Post()
  send(@CurrentUser() userId: string, @Body() dto: SendTapDto) {
    return this.taps.send(userId, dto.recipientId);
  }

  @Get("received")
  received(@CurrentUser() userId: string) {
    return this.taps.received(userId);
  }

  @Get("sent")
  sent(@CurrentUser() userId: string) {
    return this.taps.sent(userId);
  }
}
