import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { PostsService } from "./posts.service";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";

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

  @Put(":id")
  update(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdatePostDto) {
    return this.posts.update(userId, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.posts.remove(userId, id);
  }
}
