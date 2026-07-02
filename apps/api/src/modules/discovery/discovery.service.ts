import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import { DiscoveryQueryDto } from "./dto/discovery-query.dto";

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

// PRD §8: never expose exact distance under 100m unless the profile owner opted into 'exact'.
function fuzzDistance(meters: number | null, precision: string): number | null {
  if (meters == null) return null;
  if (precision === "exact") return Math.round(meters);
  return Math.ceil(meters / 100) * 100;
}

interface DiscoveryRow extends Record<string, unknown> {
  user_id: string;
  display_name: string;
  bio: string | null;
  role: string | null;
  body_type: string | null;
  health_status: string | null;
  online_status: string;
  verified_badge_tier: number;
  location_precision: string;
  date_of_birth: string | null;
  distance_m: number | null;
  created_at: string;
}

@Injectable()
export class DiscoveryService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async list(viewerId: string, query: DiscoveryQueryDto) {
    const conditions = [sql`p.user_id != ${viewerId}`, sql`p.visibility != 'hidden'`];

    if (query.onlineOnly === "true") {
      conditions.push(sql`p.online_status = 'online'`);
    }
    if (query.role) {
      conditions.push(sql`p.role = ${query.role}`);
    }
    if (query.bodyType) {
      conditions.push(sql`p.body_type = ${query.bodyType}`);
    }
    if (query.healthStatus) {
      conditions.push(sql`p.health_status = ${query.healthStatus}`);
    }
    if (query.hashtag) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM profile_hashtags ph JOIN hashtags h ON h.id = ph.hashtag_id WHERE ph.user_id = p.user_id AND h.tag = ${query.hashtag})`
      );
    }

    const whereClause = sql.join(conditions, sql` AND `);
    const sortByDistance = query.sort !== "new";
    const orderClause = sortByDistance
      ? sql`ORDER BY distance_m ASC NULLS LAST, p.created_at DESC`
      : sql`ORDER BY p.created_at DESC`;

    const result = await this.db.execute<DiscoveryRow>(sql`
      SELECT
        p.user_id, p.display_name, p.bio, p.role, p.body_type, p.health_status,
        p.online_status, p.verified_badge_tier, p.location_precision, p.created_at,
        u.date_of_birth,
        CASE
          WHEN p.location IS NOT NULL AND p.location_shared AND viewer.location IS NOT NULL
          THEN ST_Distance(p.location, viewer.location)
          ELSE NULL
        END AS distance_m
      FROM profiles p
      JOIN users u ON u.id = p.user_id
      CROSS JOIN (SELECT location FROM profiles WHERE user_id = ${viewerId}) viewer
      WHERE ${whereClause}
      ${orderClause}
      LIMIT 50
    `);

    return result.rows.map((row) => ({
      userId: row.user_id,
      displayName: row.display_name,
      bio: row.bio,
      role: row.role,
      bodyType: row.body_type,
      healthStatus: row.health_status,
      onlineStatus: row.online_status,
      verifiedBadgeTier: row.verified_badge_tier,
      age: computeAge(row.date_of_birth),
      distanceMeters: fuzzDistance(row.distance_m, row.location_precision)
    }));
  }
}
