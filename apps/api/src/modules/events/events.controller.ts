import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/create-event.dto";

@Controller("events")
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.events.list(userId);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateEventDto) {
    return this.events.create(userId, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.events.remove(userId, id);
  }

  @Post(":id/attend")
  attend(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.events.attend(userId, id);
  }

  @Delete(":id/attend")
  unattend(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.events.unattend(userId, id);
  }
}
