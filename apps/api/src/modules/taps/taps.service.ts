import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import { taps, profiles } from "../../db/schema";

@Injectable()
export class TapsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async send(senderId: string, recipientId: string) {
    const existing = await this.db.query.taps.findFirst({
      where: and(eq(taps.senderId, senderId), eq(taps.recipientId, recipientId))
    });
    if (existing) return existing;

    const [tap] = await this.db.insert(taps).values({ senderId, recipientId }).returning();
    return tap;
  }

  async received(userId: string) {
    const rows = await this.db
      .select({ id: taps.id, createdAt: taps.createdAt, senderId: taps.senderId, displayName: profiles.displayName })
      .from(taps)
      .innerJoin(profiles, eq(profiles.userId, taps.senderId))
      .where(eq(taps.recipientId, userId))
      .orderBy(desc(taps.createdAt));
    return rows;
  }

  async sent(userId: string) {
    const rows = await this.db
      .select({
        id: taps.id,
        createdAt: taps.createdAt,
        recipientId: taps.recipientId,
        displayName: profiles.displayName
      })
      .from(taps)
      .innerJoin(profiles, eq(profiles.userId, taps.recipientId))
      .where(eq(taps.senderId, userId))
      .orderBy(desc(taps.createdAt));
    return rows;
  }
}
