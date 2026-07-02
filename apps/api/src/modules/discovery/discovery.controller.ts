import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { DiscoveryService } from "./discovery.service";
import { DiscoveryQueryDto } from "./dto/discovery-query.dto";

@Controller("discovery")
@UseGuards(JwtAuthGuard)
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Get()
  list(@CurrentUser() userId: string, @Query() query: DiscoveryQueryDto) {
    return this.discovery.list(userId, query);
  }
}
