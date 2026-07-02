import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import { profiles, users, hashtags, profileHashtags } from "../../db/schema";
import { UpsertProfileDto } from "./dto/upsert-profile.dto";

function computeAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

@Injectable()
export class ProfilesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async getOwn(userId: string) {
    const profile = await this.db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
    if (!profile) {
      throw new NotFoundException("Profile not created yet");
    }
    const user = await this.db.query.users.findFirst({ where: eq(users.id, userId) });
    const tags = await this.getHashtags(userId);
    return { ...profile, age: computeAge(user?.dateOfBirth ?? null), hashtags: tags };
  }

  async upsert(userId: string, dto: UpsertProfileDto) {
    const { latitude, longitude, hashtags: tagNames, ...profileFields } = dto;

    const values: Record<string, unknown> = { userId, ...profileFields };
    if (latitude != null && longitude != null) {
      values.location = sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography`;
    }

    const [profile] = await this.db
      .insert(profiles)
      .values(values as typeof profiles.$inferInsert)
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { ...values, updatedAt: new Date() } as Partial<typeof profiles.$inferInsert>
      })
      .returning();

    if (tagNames) {
      await this.setHashtags(userId, tagNames);
    }

    const user = await this.db.query.users.findFirst({ where: eq(users.id, userId) });
    const tags = await this.getHashtags(userId);
    return { ...profile, age: computeAge(user?.dateOfBirth ?? null), hashtags: tags };
  }

  private async getHashtags(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ tag: hashtags.tag })
      .from(profileHashtags)
      .innerJoin(hashtags, eq(profileHashtags.hashtagId, hashtags.id))
      .where(eq(profileHashtags.userId, userId));
    return rows.map((r) => r.tag);
  }

  private async setHashtags(userId: string, tagNames: string[]) {
    const cleaned = [...new Set(tagNames.map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 10);

    await this.db.delete(profileHashtags).where(eq(profileHashtags.userId, userId));
    if (cleaned.length === 0) return;

    for (const tag of cleaned) {
      const [hashtag] = await this.db
        .insert(hashtags)
        .values({ tag })
        .onConflictDoUpdate({ target: hashtags.tag, set: { tag } })
        .returning();
      await this.db.insert(profileHashtags).values({ userId, hashtagId: hashtag.id }).onConflictDoNothing();
    }
  }
}
