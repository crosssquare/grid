import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { FavoritesService } from "./favorites.service";

@Controller("favorites")
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.favorites.list(userId);
  }

  @Post(":userId")
  add(@CurrentUser() userId: string, @Param("userId", ParseUUIDPipe) favoriteId: string) {
    return this.favorites.add(userId, favoriteId);
  }

  @Delete(":userId")
  remove(@CurrentUser() userId: string, @Param("userId", ParseUUIDPipe) favoriteId: string) {
    return this.favorites.remove(userId, favoriteId);
  }
}
