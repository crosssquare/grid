import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ReviewsModule } from "../reviews/reviews.module";
import { ProfilesController } from "./profiles.controller";
import { ProfilesService } from "./profiles.service";

@Module({
  imports: [AuthModule, ReviewsModule],
  controllers: [ProfilesController],
  providers: [ProfilesService]
})
export class ProfilesModule {}
