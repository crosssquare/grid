import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import { feedPosts } from "../../db/schema";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";

interface FeedRow extends Record<string, unknown> {
  kind: "post" | "like" | "review";
  id: string;
  actor_id: string;
  target_user_id: string | null;
  body: string | null;
  media_id: string | null;
  rating: number | null;
  created_at: string;
  actor_display_name: string;
  actor_profile_photo_storage_key: string | null;
  target_display_name: string | null;
  media_storage_key: string | null;
  media_type: string | null;
  like_count: number;
  i_liked: boolean;
}

@Injectable()
export class PostsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async create(userId: string, dto: CreatePostDto) {
    if (!dto.body && !dto.mediaId) {
      throw new BadRequestException("A post needs text or media");
    }
    const [post] = await this.db
      .insert(feedPosts)
      .values({ userId, body: dto.body, mediaId: dto.mediaId })
      .returning();
    return post;
  }

  // Timeline: the single shared public activity stream (PRD §4/§5.5), combining a user's own
  // authored posts with two other activity kinds — liking a photo and leaving an approved+public
  // review — so all three surface in one chronological feed. Hides activity from blocked users
  // (either direction) and from hidden profiles, except the viewer's own activity always shows
  // to themselves. Reviewer identity is intentionally shown even when a review is anonymized to
  // public profile viewers elsewhere — an explicit product decision for this surface.
  async listFeed(viewerId: string) {
    const result = await this.db.execute<FeedRow>(sql`
      WITH activities AS (
        SELECT
          'post'::text AS kind, 'post-' || fp.id::text AS id, fp.user_id AS actor_id,
          NULL::uuid AS target_user_id, fp.body AS body, fp.media_id AS media_id,
          NULL::smallint AS rating, fp.created_at AS created_at
        FROM feed_posts fp

        UNION ALL

        SELECT
          'like', 'like-' || ml.user_id::text || '-' || ml.media_id::text, ml.user_id,
          m.user_id, NULL, ml.media_id,
          NULL, ml.created_at
        FROM media_likes ml
        JOIN media m ON m.id = ml.media_id

        UNION ALL

        SELECT
          'review', 'review-' || r.id::text, r.reviewer_id,
          r.reviewee_id, r.body, NULL,
          r.rating, r.created_at
        FROM reviews r
        WHERE r.status = 'approved' AND r.visibility = 'public'
      )
      SELECT
        a.kind, a.id, a.actor_id, a.target_user_id, a.body, a.media_id, a.rating, a.created_at,
        actor.display_name AS actor_display_name,
        actor_pm.storage_key AS actor_profile_photo_storage_key,
        target.display_name AS target_display_name,
        m.storage_key AS media_storage_key, m.media_type,
        (SELECT count(*)::int FROM media_likes ml2 WHERE ml2.media_id = a.media_id) AS like_count,
        EXISTS(SELECT 1 FROM media_likes ml3 WHERE ml3.media_id = a.media_id AND ml3.user_id = ${viewerId}) AS i_liked
      FROM activities a
      JOIN profiles actor ON actor.user_id = a.actor_id
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
      ORDER BY a.created_at DESC
      LIMIT 100
    `);

    return result.rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      userId: row.actor_id,
      body: row.body,
      mediaId: row.media_id,
      mediaStorageKey: row.media_storage_key,
      mediaType: row.media_type,
      rating: row.rating,
      createdAt: row.created_at,
      displayName: row.actor_display_name,
      profilePhotoStorageKey: row.actor_profile_photo_storage_key,
      targetUserId: row.target_user_id,
      targetDisplayName: row.target_display_name,
      likeCount: row.like_count,
      iLiked: row.i_liked,
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
    return { deleted: true };
  }
}
