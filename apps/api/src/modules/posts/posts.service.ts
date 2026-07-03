import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import { feedPosts } from "../../db/schema";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";

interface FeedRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  body: string | null;
  media_id: string | null;
  media_storage_key: string | null;
  media_type: string | null;
  created_at: string;
  display_name: string;
  profile_photo_storage_key: string | null;
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

  // Timeline: the single shared public activity stream, everyone's posts in
  // one place (PRD §4/§5.5) — not a per-profile feature. Hides posts from
  // blocked users (either direction) and from hidden profiles, except the
  // viewer's own posts always show to themselves.
  async listFeed(viewerId: string) {
    const result = await this.db.execute<FeedRow>(sql`
      SELECT fp.id, fp.user_id, fp.body, fp.media_id, fp.created_at,
             p.display_name, pm.storage_key AS profile_photo_storage_key,
             m.storage_key AS media_storage_key, m.media_type
      FROM feed_posts fp
      JOIN profiles p ON p.user_id = fp.user_id
      LEFT JOIN media pm ON pm.id = p.profile_photo_media_id
      LEFT JOIN media m ON m.id = fp.media_id
      WHERE (p.visibility != 'hidden' OR fp.user_id = ${viewerId})
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.user_id = ${viewerId} AND b.blocked_id = fp.user_id)
             OR (b.user_id = fp.user_id AND b.blocked_id = ${viewerId})
        )
      ORDER BY fp.created_at DESC
      LIMIT 100
    `);

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      body: row.body,
      mediaId: row.media_id,
      mediaStorageKey: row.media_storage_key,
      mediaType: row.media_type,
      createdAt: row.created_at,
      displayName: row.display_name,
      profilePhotoStorageKey: row.profile_photo_storage_key,
      isMine: row.user_id === viewerId
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
