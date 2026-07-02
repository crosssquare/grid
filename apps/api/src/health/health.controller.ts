import { Controller, Get, Inject } from "@nestjs/common";
import { Pool } from "pg";
import Redis from "ioredis";
import { PG_POOL } from "../db/db.module";
import { REDIS_CLIENT } from "../redis/redis.module";

@Controller("health")
export class HealthController {
  constructor(
    @Inject(PG_POOL) private readonly pgPool: Pool,
    @Inject(REDIS_CLIENT) private readonly redis: Redis
  ) {}

  @Get()
  async check() {
    const [db, redis] = await Promise.allSettled([this.checkDb(), this.checkRedis()]);

    return {
      status: db.status === "fulfilled" && redis.status === "fulfilled" ? "ok" : "degraded",
      db: db.status === "fulfilled" ? "ok" : `error: ${db.reason}`,
      redis: redis.status === "fulfilled" ? "ok" : `error: ${redis.reason}`
    };
  }

  private async checkDb() {
    await this.pgPool.query("SELECT 1");
  }

  private async checkRedis() {
    await this.redis.ping();
  }
}
