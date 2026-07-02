import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, or } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import { blocks, feedPosts, profiles } from "../../db/schema";
import { CreatePostDto } from "./dto/create-post.dto";

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

  // Timeline: this user's own posts, reverse-chronological, anchored to their profile
  // (PRD §4/§5.5) — distinct from the aggregate scrolling Newsfeed, though same source rows.
  async listForUser(viewerId: string, targetUserId: string) {
    const isSelf = viewerId === targetUserId;

    if (!isSelf) {
      const blocked = await this.db.query.blocks.findFirst({
        where: or(
          and(eq(blocks.userId, viewerId), eq(blocks.blockedId, targetUserId)),
          and(eq(blocks.userId, targetUserId), eq(blocks.blockedId, viewerId))
        )
      });
      if (blocked) throw new NotFoundException("Profile not found");

      const profile = await this.db.query.profiles.findFirst({ where: eq(profiles.userId, targetUserId) });
      if (!profile || profile.visibility === "hidden") {
        return [];
      }
    }

    return this.db.query.feedPosts.findMany({
      where: eq(feedPosts.userId, targetUserId),
      orderBy: desc(feedPosts.createdAt)
    });
  }

  listMine(userId: string) {
    return this.db.query.feedPosts.findMany({
      where: eq(feedPosts.userId, userId),
      orderBy: desc(feedPosts.createdAt)
    });
  }

  async remove(userId: string, postId: string) {
    const post = await this.db.query.feedPosts.findFirst({ where: eq(feedPosts.id, postId) });
    if (!post) throw new NotFoundException("Post not found");
    if (post.userId !== userId) throw new ForbiddenException("Not your post");
    await this.db.delete(feedPosts).where(eq(feedPosts.id, postId));
    return { deleted: true };
  }
}
