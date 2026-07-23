import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import { comments, feedPosts, media, postMedia } from "../../db/schema";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";

export interface FeedMediaJson {
  id: string;
  storageKey: string;
  mediaType: string;
  likeCount: number;
  iLiked: boolean;
}

interface FeedRow extends Record<string, unknown> {
  kind: "post" | "like" | "review" | "event_created" | "event_joined";
  id: string;
  entity_id: string | null;
  actor_id: string;
  target_user_id: string | null;
  body: string | null;
  media_id: string | null;
  rating: number | null;
  created_at: string;
  actor_display_name: string;
  actor_profile_photo_storage_key: string | null;
  actor_last_seen_at: string | null;
  target_display_name: string | null;
  media_storage_key: string | null;
  media_type: string | null;
  like_count: number;
  i_liked: boolean;
  comment_count: number;
  post_media_json: FeedMediaJson[] | null;
}

@Injectable()
export class PostsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async create(userId: string, dto: CreatePostDto) {
    const mediaIds = dto.mediaIds ?? (dto.mediaId ? [dto.mediaId] : []);
    if (!dto.body?.trim() && mediaIds.length === 0) {
      throw new BadRequestException("A post needs text or media");
    }

    if (mediaIds.length > 0) {
      const owned = await this.db.query.media.findMany({ where: inArray(media.id, mediaIds) });
      if (owned.length !== mediaIds.length || owned.some((m) => m.userId !== userId)) {
        throw new BadRequestException("You can only attach your own photos");
      }
    }

    const [post] = await this.db
      .insert(feedPosts)
      .values({ userId, body: dto.body, mediaId: mediaIds[0] ?? null })
      .returning();
    if (mediaIds.length > 0) {
      await this.db
        .insert(postMedia)
        .values(mediaIds.map((mediaId, position) => ({ postId: post.id, mediaId, position })));
      // Composer attachments are uploaded as private drafts so an abandoned draft never
      // reaches the gallery (see MediaService.upload). Submitting the post is what
      // publishes them.
      await this.db
        .update(media)
        .set({ visibility: "public" })
        .where(and(inArray(media.id, mediaIds), eq(media.userId, userId), eq(media.visibility, "private")));
    }
    return post;
  }

  // Timeline: the single shared public activity stream (PRD §4/§5.5), combining a user's own
  // authored posts with four other activity kinds — liking a photo, leaving an approved+public
  // review, creating an event and joining one — so all surface in one chronological feed. Hides activity from blocked users
  // (either direction) and from hidden profiles, except the viewer's own activity always shows
  // to themselves. Reviewer identity is intentionally shown even when a review is anonymized to
  // public profile viewers elsewhere — an explicit product decision for this surface.
  //
  // Like semantics per kind: posts carry per-photo likes inside `media[]` (a post is likeable
  // photo-by-photo); review entries are likeable as a whole via review_likes; "liked" entries
  // reference the photo's own media_likes count.
  async listFeed(viewerId: string) {
    const result = await this.db.execute<FeedRow>(sql`
      WITH activities AS (
        SELECT
          'post'::text AS kind, 'post-' || fp.id::text AS id, fp.id AS entity_id, fp.user_id AS actor_id,
          NULL::uuid AS target_user_id, fp.body AS body, NULL::uuid AS media_id,
          NULL::smallint AS rating, fp.created_at AS created_at
        FROM feed_posts fp

        UNION ALL

        SELECT
          'like', 'like-' || ml.user_id::text || '-' || ml.media_id::text, NULL, ml.user_id,
          m.user_id, NULL, ml.media_id,
          NULL, ml.created_at
        FROM media_likes ml
        JOIN media m ON m.id = ml.media_id

        UNION ALL

        SELECT
          'review', 'review-' || r.id::text, r.id, r.reviewer_id,
          r.reviewee_id, r.body, NULL,
          r.rating, r.created_at
        FROM reviews r
        WHERE r.status = 'approved' AND r.visibility = 'public'

        UNION ALL

        -- Creating an event is public activity, same as posting.
        SELECT
          'event_created', 'event-' || e.id::text, e.id, e.creator_id,
          NULL, e.title, NULL,
          NULL, e.created_at
        FROM events e

        UNION ALL

        -- ...and so is joining one. Ordered by when you joined, not when the event
        -- was made, which is why event_attendees carries its own created_at.
        SELECT
          'event_joined', 'eventjoin-' || ea.event_id::text || '-' || ea.user_id::text, ea.event_id, ea.user_id,
          NULL, e2.title, NULL,
          NULL, ea.created_at
        FROM event_attendees ea
        JOIN events e2 ON e2.id = ea.event_id
      )
      SELECT
        a.kind, a.id, a.entity_id, a.actor_id, a.target_user_id, a.body, a.media_id, a.rating, a.created_at,
        actor.display_name AS actor_display_name,
        actor_pm.storage_key AS actor_profile_photo_storage_key,
        au.last_seen_at AS actor_last_seen_at,
        target.display_name AS target_display_name,
        m.storage_key AS media_storage_key, m.media_type,
        CASE a.kind
          WHEN 'review' THEN (SELECT count(*)::int FROM review_likes rl WHERE rl.review_id = a.entity_id)
          WHEN 'event_created' THEN 0
          WHEN 'event_joined' THEN 0
          ELSE (SELECT count(*)::int FROM media_likes ml2 WHERE ml2.media_id = a.media_id)
        END AS like_count,
        CASE a.kind
          WHEN 'review' THEN EXISTS(SELECT 1 FROM review_likes rl2 WHERE rl2.review_id = a.entity_id AND rl2.user_id = ${viewerId})
          WHEN 'event_created' THEN false
          WHEN 'event_joined' THEN false
          ELSE EXISTS(SELECT 1 FROM media_likes ml3 WHERE ml3.media_id = a.media_id AND ml3.user_id = ${viewerId})
        END AS i_liked,
        CASE a.kind
          WHEN 'post' THEN (SELECT count(*)::int FROM comments c WHERE c.target_type = 'post' AND c.target_id = a.entity_id)
          WHEN 'review' THEN (SELECT count(*)::int FROM comments c WHERE c.target_type = 'review' AND c.target_id = a.entity_id)
          ELSE 0
        END AS comment_count,
        CASE WHEN a.kind = 'post' THEN (
          SELECT json_agg(json_build_object(
            'id', m2.id,
            'storageKey', m2.storage_key,
            'mediaType', m2.media_type,
            'likeCount', (SELECT count(*)::int FROM media_likes ml4 WHERE ml4.media_id = m2.id),
            'iLiked', EXISTS(SELECT 1 FROM media_likes ml5 WHERE ml5.media_id = m2.id AND ml5.user_id = ${viewerId})
          ) ORDER BY pm.position)
          FROM post_media pm JOIN media m2 ON m2.id = pm.media_id
          WHERE pm.post_id = a.entity_id
        ) END AS post_media_json
      FROM activities a
      JOIN profiles actor ON actor.user_id = a.actor_id
      JOIN users au ON au.id = a.actor_id
      LEFT JOIN media actor_pm ON actor_pm.id = actor.profile_photo_media_id
      LEFT JOIN profiles target ON target.user_id = a.target_user_id
      LEFT JOIN media m ON m.id = a.media_id
      WHERE (actor.visibility != 'hidden' OR a.actor_id = ${viewerId})
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.user_id = ${viewerId} AND b.blocked_id = a.actor_id)
             OR (b.user_id = a.actor_id AND b.blocked_id = ${viewerId})
        )
        -- A "liked" activity is social proof for everyone else, not a notice-to-self —
        -- suppress your own like activity from your own feed (unlike posts/reviews, which
        -- you'd naturally still want to see yourself).
        AND NOT (a.kind = 'like' AND a.actor_id = ${viewerId})
        AND NOT (a.kind = 'event_joined' AND a.actor_id = ${viewerId})
      ORDER BY a.created_at DESC
      LIMIT 100
    `);

    return result.rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      userId: row.actor_id,
      body: row.body,
      // Event activity carries the event id so the client can deep-link into the tab.
      eventId: row.kind === "event_created" || row.kind === "event_joined" ? row.entity_id : null,
      mediaId: row.media_id,
      mediaStorageKey: row.media_storage_key,
      mediaType: row.media_type,
      media: row.post_media_json ?? [],
      rating: row.rating,
      createdAt: row.created_at,
      displayName: row.actor_display_name,
      profilePhotoStorageKey: row.actor_profile_photo_storage_key,
      lastSeenAt: row.actor_last_seen_at,
      targetUserId: row.target_user_id,
      targetDisplayName: row.target_display_name,
      likeCount: row.like_count,
      iLiked: row.i_liked,
      commentCount: row.comment_count,
      isMine: row.actor_id === viewerId
    }));
  }

  async update(userId: string, postId: string, dto: UpdatePostDto) {
    const post = await this.db.query.feedPosts.findFirst({ where: eq(feedPosts.id, postId) });
    if (!post) throw new NotFoundException("Post not found");
    if (post.userId !== userId) throw new ForbiddenException("Not your post");
    const [updated] = await this.db
      .update(feedPosts)
      .set({ body: dto.body })
      .where(eq(feedPosts.id, postId))
      .returning();
    return updated;
  }

  async remove(userId: string, postId: string) {
    const post = await this.db.query.feedPosts.findFirst({ where: eq(feedPosts.id, postId) });
    if (!post) throw new NotFoundException("Post not found");
    if (post.userId !== userId) throw new ForbiddenException("Not your post");
    await this.db.delete(feedPosts).where(eq(feedPosts.id, postId));
    // comments.target_id has no FK (polymorphic target) — clean up the thread here
    await this.db.delete(comments).where(sql`${comments.targetType} = 'post' AND ${comments.targetId} = ${postId}`);
    return { deleted: true };
  }
}
