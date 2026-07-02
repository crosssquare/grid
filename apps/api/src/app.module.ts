import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./config/env.validation";
import { DbModule } from "./db/db.module";
import { RedisModule } from "./redis/redis.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ProfilesModule } from "./modules/profiles/profiles.module";
import { MediaModule } from "./modules/media/media.module";
import { DiscoveryModule } from "./modules/discovery/discovery.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [validateEnv]
    }),
    DbModule,
    RedisModule,
    HealthModule,
    AuthModule,
    ProfilesModule,
    MediaModule,
    DiscoveryModule
  ]
})
export class AppModule {}
