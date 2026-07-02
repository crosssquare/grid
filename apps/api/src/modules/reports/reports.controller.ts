import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { ReportsService } from "./reports.service";
import { CreateReportDto } from "./dto/create-report.dto";

@Controller("reports")
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateReportDto) {
    return this.reports.create(userId, dto);
  }
}
