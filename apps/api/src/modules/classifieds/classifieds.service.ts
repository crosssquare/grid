import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import { classifieds } from "../../db/schema";
import { CreateClassifiedDto } from "./dto/create-classified.dto";

interface ClassifiedRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  body: string;
  anonymous: boolean;
  available_from: string | null;
  available_to: string | null;
  created_at: string;
  author_display_name: string;
  author_profile_photo_storage_key: string | null;
  distance_m: number | null;
}

@Injectable()
export class ClassifiedsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  // Newest first, expired listings dropped. Blocked users are hidden in both directions,
  // same rule the Timeline and Grid use.
  async list(viewerId: string) {
    const result = await this.db.execute<ClassifiedRow>(sql`
      SELECT
        c.id, c.user_id, c.body, c.anonymous, c.available_from, c.available_to, c.created_at,
        author.display_name AS author_display_name,
        pm.storage_key AS author_profile_photo_storage_key,
        CASE WHEN c.location IS NOT NULL AND viewer.location IS NOT NULL
          THEN round(ST_Distance(c.location, viewer.location))
          ELSE NULL
        END AS distance_m
      FROM classifieds c
      JOIN profiles author ON author.user_id = c.user_id
      LEFT JOIN media pm ON pm.id = author.profile_photo_media_id
      LEFT JOIN profiles viewer ON viewer.user_id = ${viewerId}
      WHERE (c.available_to IS NULL OR c.available_to >= now())
        AND (author.visibility != 'hidden' OR c.user_id = ${viewerId})
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.user_id = ${viewerId} AND b.blocked_id = c.user_id)
             OR (b.user_id = c.user_id AND b.blocked_id = ${viewerId})
        )
      ORDER BY c.created_at DESC
      LIMIT 100
    `);

    return result.rows.map((r) => {
      const isMine = r.user_id === viewerId;
      // Anonymity is enforced here, not in the client: an anonymous listing must not
      // ship the author's id or name over the wire at all. The author still sees their
      // own listing as theirs so they can delete it.
      const hideAuthor = r.anonymous && !isMine;
      return {
        id: r.id,
        userId: hideAuthor ? null : r.user_id,
        displayName: hideAuthor ? null : r.author_display_name,
        profilePhotoStorageKey: hideAuthor ? null : r.author_profile_photo_storage_key,
        body: r.body,
        anonymous: r.anonymous,
        availableFrom: r.available_from,
        availableTo: r.available_to,
        createdAt: r.created_at,
        distanceMeters: r.distance_m == null ? null : Number(r.distance_m),
        isMine
      };
    });
  }

  async create(userId: string, dto: CreateClassifiedDto) {
    const { latitude, longitude, availableFrom, availableTo, ...rest } = dto;
    const values: Record<string, unknown> = {
      userId,
      ...rest,
      availableFrom: availableFrom ? new Date(availableFrom) : null,
      availableTo: availableTo ? new Date(availableTo) : null
    };
    if (latitude != null && longitude != null) {
      values.location = sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography`;
    }
    const [row] = await this.db
      .insert(classifieds)
      .values(values as typeof classifieds.$inferInsert)
      .returning();
    return row;
  }

  async remove(userId: string, id: string) {
    const row = await this.db.query.classifieds.findFirst({ where: (c, { eq }) => eq(c.id, id) });
    if (!row) throw new NotFoundException("Classified not found");
    if (row.userId !== userId) throw new ForbiddenException("Not your classified");
    await this.db.delete(classifieds).where(sql`${classifieds.id} = ${id}`);
    return { deleted: true };
  }
}
