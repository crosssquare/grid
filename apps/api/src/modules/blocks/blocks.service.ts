import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import { blocks, profiles } from "../../db/schema";

@Injectable()
export class BlocksService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async add(userId: string, blockedId: string) {
    if (userId === blockedId) {
      throw new BadRequestException("Can't block yourself");
    }
    await this.db.insert(blocks).values({ userId, blockedId }).onConflictDoNothing();
    return { blocked: true };
  }

  async remove(userId: string, blockedId: string) {
    await this.db.delete(blocks).where(and(eq(blocks.userId, userId), eq(blocks.blockedId, blockedId)));
    return { blocked: false };
  }

  async list(userId: string) {
    const rows = await this.db
      .select({ userId: profiles.userId, displayName: profiles.displayName, blockedAt: blocks.createdAt })
      .from(blocks)
      .innerJoin(profiles, eq(profiles.userId, blocks.blockedId))
      .where(eq(blocks.userId, userId));
    return rows;
  }
}
