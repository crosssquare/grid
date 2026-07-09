import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto } from "./dto/create-review.dto";
import { DecideReviewDto } from "./dto/decide-review.dto";
import { ReportReviewDto } from "./dto/report-review.dto";

@Controller("reviews")
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateReviewDto) {
    return this.reviews.create(userId, dto);
  }

  @Get("pending")
  listPending(@CurrentUser() userId: string) {
    return this.reviews.listPending(userId);
  }

  @Get("mine")
  listMine(@CurrentUser() userId: string) {
    return this.reviews.listMine(userId);
  }

  @Put(":id/decision")
  decide(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string, @Body() dto: DecideReviewDto) {
    return this.reviews.decide(userId, id, dto);
  }

  @Post(":id/report")
  report(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string, @Body() dto: ReportReviewDto) {
    return this.reviews.report(userId, id, dto);
  }

  @Post(":id/like")
  like(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.reviews.like(userId, id);
  }

  @Delete(":id/like")
  unlike(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.reviews.unlike(userId, id);
  }
}
