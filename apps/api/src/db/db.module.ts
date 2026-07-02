import { Module, Global } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";

export const PG_POOL = "PG_POOL";
export const DRIZZLE_DB = "DRIZZLE_DB";

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionString = config.get<string>("databaseUrl")!;
        // Supabase's pooled connection requires TLS; local Postgres (docker-compose) does not.
        const requiresSsl = !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1");
        return new Pool({
          connectionString,
          ssl: requiresSsl ? { rejectUnauthorized: false } : undefined
        });
      }
    },
    {
      provide: DRIZZLE_DB,
      inject: [PG_POOL],
      useFactory: (pool: Pool): NodePgDatabase => drizzle(pool)
    }
  ],
  exports: [PG_POOL, DRIZZLE_DB]
})
export class DbModule {}
