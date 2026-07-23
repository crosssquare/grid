import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { ClassifiedsService } from "./classifieds.service";
import { CreateClassifiedDto } from "./dto/create-classified.dto";

@Controller("classifieds")
@UseGuards(JwtAuthGuard)
export class ClassifiedsController {
  constructor(private readonly classifieds: ClassifiedsService) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.classifieds.list(userId);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateClassifiedDto) {
    return this.classifieds.create(userId, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.classifieds.remove(userId, id);
  }
}
