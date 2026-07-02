import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TapsController } from "./taps.controller";
import { TapsService } from "./taps.service";

@Module({
  imports: [AuthModule],
  controllers: [TapsController],
  providers: [TapsService]
})
export class TapsModule {}
