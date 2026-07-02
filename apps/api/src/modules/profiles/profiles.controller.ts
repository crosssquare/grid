import { Body, Controller, Get, Param, ParseUUIDPipe, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { ProfilesService } from "./profiles.service";
import { UpsertProfileDto } from "./dto/upsert-profile.dto";

@Controller("profiles")
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get("me")
  getOwn(@CurrentUser() userId: string) {
    return this.profiles.getOwn(userId);
  }

  @Put("me")
  upsert(@CurrentUser() userId: string, @Body() dto: UpsertProfileDto) {
    return this.profiles.upsert(userId, dto);
  }

  @Get(":userId")
  getViewed(@CurrentUser() viewerId: string, @Param("userId", ParseUUIDPipe) userId: string) {
    return this.profiles.getViewed(viewerId, userId);
  }
}
