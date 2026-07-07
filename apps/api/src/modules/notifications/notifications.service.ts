import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";

interface NotificationRow extends Record<string, unknown> {
  kind: "like" | "review";
  id: string;
  actor_id: string;
  actor_display_name: string;
  actor_profile_photo_storage_key: string | null;
  media_id: string | null;
  media_storage_key: string | null;
  media_type: string | null;
  rating: number | null;
  body: string | null;
  review_status: string | null;
  created_at: string;
}

@Injectable()
export class NotificationsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async list(viewerId: string) {
    const result = await this.db.execute<NotificationRow>(sql`
      WITH items AS (
        SELECT
          'like'::text AS kind, ml.user_id::text || '-' || ml.media_id::text AS id, ml.user_id AS actor_id,
          ml.media_id AS media_id, NULL::smallint AS rating, NULL::text AS body,
          NULL::text AS review_status, ml.created_at AS created_at
        FROM media_likes ml
        JOIN media m ON m.id = ml.media_id
        WHERE m.user_id = ${viewerId} AND ml.user_id != ${viewerId}
        UNION ALL
        SELECT
          'review', r.id::text, r.reviewer_id,
          NULL, r.rating, r.body,
          r.status, r.created_at
        FROM reviews r
        WHERE r.reviewee_id = ${viewerId}
      )
      SELECT
        i.kind, i.id, i.actor_id, i.media_id, i.rating, i.body, i.review_status, i.created_at,
        actor.display_name AS actor_display_name,
        actor_pm.storage_key AS actor_profile_photo_storage_key,
        m.storage_key AS media_storage_key, m.media_type
      FROM items i
      JOIN profiles actor ON actor.user_id = i.actor_id
      LEFT JOIN media actor_pm ON actor_pm.id = actor.profile_photo_media_id
      LEFT JOIN media m ON m.id = i.media_id
      ORDER BY i.created_at DESC
      LIMIT 100
    `);

    return result.rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      actorId: row.actor_id,
      actorDisplayName: row.actor_display_name,
      actorProfilePhotoStorageKey: row.actor_profile_photo_storage_key,
      mediaId: row.media_id,
      mediaStorageKey: row.media_storage_key,
      mediaType: row.media_type,
      rating: row.rating,
      body: row.body,
      reviewStatus: row.review_status,
      createdAt: row.created_at
    }));
  }
}
