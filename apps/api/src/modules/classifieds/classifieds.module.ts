import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ClassifiedsController } from "./classifieds.controller";
import { ClassifiedsService } from "./classifieds.service";

@Module({
  imports: [AuthModule],
  controllers: [ClassifiedsController],
  providers: [ClassifiedsService]
})
export class ClassifiedsModule {}
