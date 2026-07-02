import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import { favorites, profiles } from "../../db/schema";

const STANDING_FAVORITE_CAP = 25; // free-tier cap per PRD §6; PRO removes this — not enforced yet, no PRO stub built

@Injectable()
export class FavoritesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async add(userId: string, favoriteId: string) {
    if (userId === favoriteId) {
      throw new BadRequestException("Can't favorite yourself");
    }

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(favorites)
      .where(eq(favorites.userId, userId));
    if (count >= STANDING_FAVORITE_CAP) {
      throw new BadRequestException(`Free tier is capped at ${STANDING_FAVORITE_CAP} favorites`);
    }

    await this.db.insert(favorites).values({ userId, favoriteId }).onConflictDoNothing();
    return { favorited: true };
  }

  async remove(userId: string, favoriteId: string) {
    await this.db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.favoriteId, favoriteId)));
    return { favorited: false };
  }

  async list(userId: string) {
    const rows = await this.db
      .select({
        userId: profiles.userId,
        displayName: profiles.displayName,
        onlineStatus: profiles.onlineStatus,
        favoritedAt: favorites.createdAt
      })
      .from(favorites)
      .innerJoin(profiles, eq(profiles.userId, favorites.favoriteId))
      .where(eq(favorites.userId, userId));
    return rows;
  }
}
