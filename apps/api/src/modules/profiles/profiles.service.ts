import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import { profiles, users } from "../../db/schema";
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
    return { ...profile, age: computeAge(user?.dateOfBirth ?? null) };
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
    const user = await this.db.query.users.findFirst({ where: eq(users.id, userId) });
    return { ...profile, age: computeAge(user?.dateOfBirth ?? null) };
  }
}
