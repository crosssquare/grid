import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { PostsService } from "./posts.service";
import { CreatePostDto } from "./dto/create-post.dto";

@Controller("posts")
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreatePostDto) {
    return this.posts.create(userId, dto);
  }

  @Get()
  listFeed(@CurrentUser() userId: string) {
    return this.posts.listFeed(userId);
  }

  @Delete(":id")
  remove(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.posts.remove(userId, id);
  }
}
