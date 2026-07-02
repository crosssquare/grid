import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import { profiles } from "../../db/schema";
import { UpsertProfileDto } from "./dto/upsert-profile.dto";

@Injectable()
export class ProfilesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async getOwn(userId: string) {
    const profile = await this.db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
    if (!profile) {
      throw new NotFoundException("Profile not created yet");
    }
    return profile;
  }

  async upsert(userId: string, dto: UpsertProfileDto) {
    const [profile] = await this.db
      .insert(profiles)
      .values({ userId, ...dto })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { ...dto, updatedAt: new Date() }
      })
      .returning();
    return profile;
  }
}
