import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { BlocksService } from "./blocks.service";

@Controller("blocks")
@UseGuards(JwtAuthGuard)
export class BlocksController {
  constructor(private readonly blocks: BlocksService) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.blocks.list(userId);
  }

  @Post(":userId")
  add(@CurrentUser() userId: string, @Param("userId", ParseUUIDPipe) blockedId: string) {
    return this.blocks.add(userId, blockedId);
  }

  @Delete(":userId")
  remove(@CurrentUser() userId: string, @Param("userId", ParseUUIDPipe) blockedId: string) {
    return this.blocks.remove(userId, blockedId);
  }
}
