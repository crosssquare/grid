import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { CommentsService } from "./comments.service";
import { CreateCommentDto } from "./dto/create-comment.dto";

@Controller("comments")
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateCommentDto) {
    return this.comments.create(userId, dto);
  }

  @Get(":targetType/:targetId")
  list(@Param("targetType") targetType: "post" | "review", @Param("targetId", ParseUUIDPipe) targetId: string) {
    return this.comments.list(targetType, targetId);
  }

  @Delete(":id")
  remove(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.comments.remove(userId, id);
  }
}
